const { QAAgentConfig, QAAgentRun, ActivityLog } = require('../models');
const { broadcast } = require('../socket/handlers');

// ── Config (one row per user) ─────────────────────────────────────────────────
exports.getConfig = async (req, res) => {
  try {
    const cfg = await QAAgentConfig.findOne({ where: { userId: req.user.id } });
    res.json(cfg || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.upsertConfig = async (req, res) => {
  try {
    const { provider, model, apiKey, url, siteType, categories, notes, emailAddr, state } = req.body;
    const payload = { provider, model, apiKey, url, siteType, categories, notes, emailAddr, state };
    Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

    let cfg = await QAAgentConfig.findOne({ where: { userId: req.user.id } });
    if (cfg) {
      await cfg.update(payload);
    } else {
      cfg = await QAAgentConfig.create({ userId: req.user.id, ...payload });
    }
    res.json(cfg);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteConfig = async (req, res) => {
  try {
    await QAAgentConfig.destroy({ where: { userId: req.user.id } });
    res.json({ message: 'Config cleared' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Crawler: multi-strategy page discovery ───────────────────────────────────
// Strategy priority (each adds routes to the same set, de-duplicated):
//   1. sitemap.xml / sitemap_index.xml   (authoritative, cheapest)
//   2. robots.txt → sitemap reference
//   3. Next.js __NEXT_DATA__ / build manifest extraction
//   4. BFS <a href> crawl (regex, includes href AND src and data-href)
//   5. Optional Playwright deep crawl when the above returns <5 pages
//      (only if `playwright` module is installed — gracefully skipped otherwise)
const SKIP_EXT = /\.(pdf|jpg|jpeg|png|gif|svg|webp|ico|css|js|mjs|map|zip|rar|7z|tar|gz|mp4|webm|mp3|wav|avi|mov|woff2?|ttf|otf|eot|json|rss|atom)(\?|#|$)/i;
const HREF_RE = /(?:href|data-href)\s*=\s*["']([^"'#]+)["']/gi;
const TITLE_RE = /<title[^>]*>([\s\S]*?)<\/title>/i;
const NEXT_DATA_RE = /<script\s+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i;
const SITEMAP_LOC_RE = /<loc>\s*([^<\s]+)\s*<\/loc>/gi;

function stripTags(s) { return String(s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(); }

async function fetchText(url, timeoutMs = 8000, accept = 'text/html,application/xhtml+xml,application/xml,text/xml') {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      redirect: 'follow',
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; QA-Nexus-Crawler/1.0; +dashboard)',
        'Accept': accept,
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    if (!r.ok) return { text: null, contentType: '', status: r.status, statusText: r.statusText };
    return { text: await r.text(), contentType: r.headers.get('content-type') || '', status: r.status, statusText: r.statusText };
  } catch (e) { return { text: null, contentType: '', status: 0, statusText: e.name === 'AbortError' ? 'Timeout' : 'Network Error' }; }
  finally { clearTimeout(t); }
}

async function checkPageStatus(url, timeoutMs = 8000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; QA-Nexus-Crawler/1.0; +dashboard)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    return { status: r.status, statusText: r.statusText };
  } catch (e) {
    return { status: 0, statusText: e.name === 'AbortError' ? 'Timeout' : 'Network Error' };
  } finally { clearTimeout(t); }
}

async function fetchHtml(url, timeoutMs = 8000) {
  const r = await fetchText(url, timeoutMs, 'text/html,application/xhtml+xml');
  if (!r || !r.text) return null;
  if (!/text\/html|xhtml/i.test(r.contentType)) return null;
  return r.text;
}

// ── Sitemap discovery ────────────────────────────────────────────────────────
async function discoverFromSitemap(origin) {
  const found = new Set();
  const visitedSitemaps = new Set();

  // Seed candidates
  const candidates = [
    origin + '/sitemap.xml',
    origin + '/sitemap_index.xml',
    origin + '/sitemap-index.xml',
    origin + '/sitemap/sitemap.xml',
  ];

  // Parse robots.txt for Sitemap: directives
  const robots = await fetchText(origin + '/robots.txt', 5000, 'text/plain');
  if (robots && robots.text) {
    robots.text.split('\n').forEach(line => {
      const m = line.match(/^\s*sitemap\s*:\s*(\S+)/i);
      if (m) candidates.push(m[1].trim());
    });
  }

  // BFS through sitemap index files until we have URLs
  const queue = candidates.slice();
  while (queue.length && found.size < 500) {
    const sm = queue.shift();
    if (!sm || visitedSitemaps.has(sm)) continue;
    visitedSitemaps.add(sm);
    const r = await fetchText(sm, 8000, 'application/xml,text/xml');
    if (!r || !r.text) continue;
    // .gz sitemaps are skipped (would need zlib); most sites also expose a plain one
    let m;
    SITEMAP_LOC_RE.lastIndex = 0;
    while ((m = SITEMAP_LOC_RE.exec(r.text)) !== null) {
      const loc = m[1].trim();
      if (!loc) continue;
      if (/\.xml(\.gz)?$/i.test(loc)) {
        // nested sitemap — enqueue for further parsing
        queue.push(loc);
      } else {
        found.add(loc);
      }
    }
  }
  return Array.from(found);
}

// ── __NEXT_DATA__ route extraction ───────────────────────────────────────────
function extractNextDataRoutes(html, origin) {
  const out = new Set();
  const m = html.match(NEXT_DATA_RE);
  if (!m) return [];
  try {
    const data = JSON.parse(m[1]);
    // Walk the object tree for anything that looks like an internal route
    const walk = (node) => {
      if (!node) return;
      if (typeof node === 'string') {
        if (/^\/[^\s"'<>]{1,200}$/.test(node) && !SKIP_EXT.test(node)) out.add(node);
        return;
      }
      if (Array.isArray(node)) { node.forEach(walk); return; }
      if (typeof node === 'object') {
        // Prefer fields that commonly hold routes
        for (const k of Object.keys(node)) {
          const v = node[k];
          if (['url','href','slug','path','link','permalink','canonical','route'].includes(k) && typeof v === 'string') {
            const candidate = v.startsWith('/') ? v : (v.startsWith('http') && v.startsWith(origin) ? new URL(v).pathname + new URL(v).search : null);
            if (candidate && /^\/[^\s"'<>]{1,200}$/.test(candidate) && !SKIP_EXT.test(candidate)) out.add(candidate);
          }
          walk(v);
        }
      }
    };
    walk(data);
  } catch (_) { /* malformed */ }
  return Array.from(out).map(p => origin + p);
}

// ── Optional Playwright deep crawl (only if installed) ───────────────────────
async function playwrightDeepCrawl(origin, startUrl, limit) {
  let pw;
  try { pw = require('playwright'); } catch (_) { return null; }
  let browser;
  try {
    browser = await pw.chromium.launch({ headless: true });
    const ctx = await browser.newContext({ userAgent: 'Mozilla/5.0 (compatible; QA-Nexus-Crawler/1.0; Playwright)' });
    const visited = new Set();
    const queue = [startUrl];
    const results = [];
    while (queue.length && results.length < limit) {
      const url = queue.shift();
      if (visited.has(url)) continue;
      visited.add(url);
      const page = await ctx.newPage();
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
        const title = await page.title();
        const path = (() => { try { const u = new URL(url); return u.pathname + u.search; } catch { return url; } })();
        results.push({ url, path, title: String(title || '').slice(0, 140), depth: 0, source: 'playwright' });
        const hrefs = await page.$$eval('a[href]', as => as.map(a => a.href));
        for (const h of hrefs) {
          try {
            const abs = new URL(h).href.split('#')[0];
            if (abs.startsWith(origin) && !SKIP_EXT.test(abs) && !visited.has(abs) && results.length + queue.length < limit * 2) {
              queue.push(abs);
            }
          } catch (_) { /* invalid URL */ }
        }
      } catch (_) { /* page load failed */ }
      finally { await page.close(); }
    }
    return results;
  } catch (_) { return null; }
  finally { if (browser) { try { await browser.close(); } catch (_) {} } }
}

exports.crawlSite = async (req, res) => {
  try {
    const { url, maxPages = 60, maxDepth = 2, deep = false } = req.body || {};
    if (!url) return res.status(400).json({ error: 'url is required' });
    let start;
    try { start = new URL(url); } catch (e) { return res.status(400).json({ error: 'invalid url' }); }
    if (!/^https?:$/.test(start.protocol)) return res.status(400).json({ error: 'only http(s) allowed' });

    const origin = start.origin;
    const limit = Math.max(1, Math.min(300, Number(maxPages) || 60));
    const depthLimit = Math.max(0, Math.min(5, Number(maxDepth) || 2));

    // Detect real base URL: if user gave a sub-path, check if the origin root is reachable.
    // If root returns an error (4xx/5xx/unreachable), the user-provided URL is the real base.
    let baseUrl = origin;
    const userPath = start.pathname.replace(/\/+$/, '');
    if (userPath && userPath !== '') {
      const rootCheck = await checkPageStatus(origin + '/', 5000);
      if (!rootCheck.status || rootCheck.status >= 400) {
        baseUrl = start.href.replace(/\/+$/, '');
      }
    }

    const sources = []; // trace of which strategy found pages
    const byUrl = new Map(); // canonical url → { url, path, title, depth, source }
    const externalUrls = new Map(); // malformed external links detected during crawl

    // Detect malformed external URLs embedded as relative paths, e.g.:
    //   href="/https://other.com/..." → resolves to origin + "/https://other.com/..."
    const EMBEDDED_EXT_RE = /^\/+https?:\/\//i;

    const addCandidate = (u, source, depth = 0) => {
      try {
        // Before resolving: detect raw hrefs that are clearly external but
        // written as relative paths (e.g. "/https://other.com/foo")
        if (EMBEDDED_EXT_RE.test(u)) {
          const realUrl = u.replace(/^\/+/, '').replace(/&amp;/gi, '&');
          try {
            const ext = new URL(realUrl);
            if (ext.origin !== origin && !externalUrls.has(ext.href)) {
              externalUrls.set(ext.href, {
                url: ext.href,
                path: ext.pathname + ext.search,
                title: '',
                depth,
                source,
                external: true,
              });
            }
          } catch (_) {}
          return; // don't add to internal pages
        }

        const abs = new URL(u, origin).href.split('#')[0];
        if (!abs.startsWith(origin)) return;
        if (SKIP_EXT.test(abs)) return;

        // Post-resolve check: if the path still contains "https://" or "http://"
        // it's a malformed external link that slipped through (e.g. the HTML had
        // href="https://other.com" without a leading slash, and the browser
        // resolved it relative to the current page).
        const parsed = new URL(abs);
        if (/https?:\/\//i.test(parsed.pathname)) {
          // Use the full abs URL (includes query string) to extract the embedded external URL
          const fullMatch = abs.replace(/&amp;/gi, '&').match(/\/(https?:\/\/.+)/i);
          if (fullMatch) {
            try {
              const ext = new URL(fullMatch[1]);
              if (!externalUrls.has(ext.href)) {
                externalUrls.set(ext.href, {
                  url: ext.href,
                  path: ext.pathname + ext.search,
                  title: '',
                  depth,
                  source,
                  external: true,
                });
              }
            } catch (_) {}
          }
          return; // don't add the malformed URL as an internal page
        }

        if (byUrl.has(abs)) return;
        byUrl.set(abs, {
          url: abs,
          path: parsed.pathname + parsed.search,
          title: '',
          depth,
          source,
        });
      } catch (_) { /* invalid URL */ }
    };

    // Strategy 1: sitemap.xml + robots.txt
    const smUrls = await discoverFromSitemap(origin);
    if (smUrls.length) {
      sources.push({ name: 'sitemap', count: smUrls.length });
      smUrls.forEach(u => addCandidate(u, 'sitemap', 0));
    }

    // Strategy 2: BFS regex crawl (always runs — also fills in titles and
    // picks up pages the sitemap missed)
    const bfsVisited = new Set();
    const bfsQueue = [{ url: start.href.split('#')[0], depth: 0 }];
    // Seed with sitemap results so BFS can extract titles for them
    for (const u of Array.from(byUrl.keys()).slice(0, limit)) {
      bfsQueue.push({ url: u, depth: 0 });
    }
    const errors = [];
    let bfsCount = 0;
    while (bfsQueue.length && byUrl.size < limit * 3 && bfsCount < limit * 2) {
      const { url: current, depth } = bfsQueue.shift();
      if (bfsVisited.has(current)) continue;
      bfsVisited.add(current);
      bfsCount++;

      const html = await fetchHtml(current);
      if (!html) { errors.push(current); continue; }

      // Add / update title for this page
      const titleMatch = html.match(TITLE_RE);
      const title = titleMatch ? stripTags(titleMatch[1]).slice(0, 140) : '';
      addCandidate(current, 'bfs', depth);
      const existing = byUrl.get(current.split('#')[0]);
      if (existing && !existing.title) existing.title = title;

      // Strategy 3: __NEXT_DATA__ route extraction (runs on every HTML page)
      const nextRoutes = extractNextDataRoutes(html, origin);
      if (nextRoutes.length) {
        const before = byUrl.size;
        nextRoutes.forEach(u => addCandidate(u, 'next-data', depth + 1));
        const added = byUrl.size - before;
        if (added && !sources.find(s => s.name === 'next-data')) sources.push({ name: 'next-data', count: added });
        else if (added) sources.find(s => s.name === 'next-data').count += added;
      }

      if (depth >= depthLimit) continue;

      // Regex link extraction
      let m;
      HREF_RE.lastIndex = 0;
      while ((m = HREF_RE.exec(html)) !== null) {
        let href = m[1].trim();
        if (!href || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:') || href.startsWith('data:')) continue;
        let abs;
        try { abs = new URL(href, current).href.split('#')[0]; } catch (_) { continue; }
        if (!abs.startsWith(origin)) continue;
        if (SKIP_EXT.test(abs)) continue;
        addCandidate(abs, 'bfs', depth + 1);
        if (!bfsVisited.has(abs) && bfsQueue.length < limit * 3) {
          bfsQueue.push({ url: abs, depth: depth + 1 });
        }
      }
    }
    if (!sources.find(s => s.name === 'bfs')) {
      sources.push({ name: 'bfs', count: Array.from(byUrl.values()).filter(p => p.source === 'bfs').length });
    }

    // Strategy 5: Playwright fallback when the static crawl yielded too few
    // pages AND the caller opted in with `deep: true`. Silently no-ops if
    // playwright isn't installed.
    if (deep && byUrl.size < 5) {
      const pwPages = await playwrightDeepCrawl(origin, start.href, limit);
      if (pwPages && pwPages.length) {
        pwPages.forEach(p => {
          if (!byUrl.has(p.url)) byUrl.set(p.url, p);
          else {
            const ex = byUrl.get(p.url);
            if (!ex.title && p.title) ex.title = p.title;
          }
        });
        sources.push({ name: 'playwright', count: pwPages.length });
      }
    }

    // Finalise — cap to the requested limit, sort by depth then path length
    const allPages = Array.from(byUrl.values())
      .sort((a, b) => a.depth - b.depth || a.path.length - b.path.length)
      .slice(0, limit);

    // Append external URLs at the end
    const extPages = Array.from(externalUrls.values());

    // Check HTTP status for all pages (internal + external), batched
    const combined = [...allPages, ...extPages];
    const BATCH = 10;
    for (let i = 0; i < combined.length; i += BATCH) {
      const batch = combined.slice(i, i + BATCH);
      const results = await Promise.all(batch.map(p => checkPageStatus(p.url)));
      batch.forEach((p, j) => {
        p.httpStatus = results[j].status;
        p.httpStatusText = results[j].statusText;
      });
    }

    res.json({
      origin,
      baseUrl,
      pages: combined,
      count: combined.length,
      discovered: byUrl.size + externalUrls.size,
      truncated: byUrl.size > limit,
      sources,
      errors: errors.length,
      externalCount: extPages.length,
      playwrightAvailable: (() => { try { require.resolve('playwright'); return true; } catch { return false; } })(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Runs ──────────────────────────────────────────────────────────────────────
exports.listRuns = async (req, res) => {
  try {
    const { projectId, limit = 50 } = req.query;
    const where = { userId: req.user.id };
    if (projectId) where.projectId = projectId;
    const runs = await QAAgentRun.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      attributes: { exclude: ['reportHtml', 'results'] },
    });
    res.json(runs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getRun = async (req, res) => {
  try {
    const run = await QAAgentRun.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!run) return res.status(404).json({ error: 'Run not found' });
    res.json(run);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createRun = async (req, res) => {
  try {
    const body = req.body || {};
    const run = await QAAgentRun.create({
      userId: req.user.id,
      projectId: body.projectId || null,
      url: body.url,
      provider: body.provider,
      model: body.model,
      categories: body.categories || [],
      status: body.status || 'completed',
      totalTests: body.totalTests || 0,
      passCount: body.passCount || 0,
      failCount: body.failCount || 0,
      blockedCount: body.blockedCount || 0,
      passRate: body.passRate || 0,
      durationMs: body.durationMs,
      results: body.results || {},
      bugs: body.bugs || [],
      testCases: body.testCases || [],
      reportHtml: body.reportHtml,
    });

    await ActivityLog.create({
      action: `QA Agent run completed for ${body.url || 'site'}`,
      entityType: 'qa_agent_run', entityId: run.id,
      icon: '🤖', iconColor: 'var(--lime)',
      userId: req.user.id,
    });

    if (req.io) broadcast(req.io, 'qa-agent:run-created', { id: run.id, url: run.url, passRate: run.passRate });
    res.status(201).json(run);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteRun = async (req, res) => {
  try {
    const run = await QAAgentRun.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!run) return res.status(404).json({ error: 'Run not found' });
    await run.destroy();
    res.json({ message: 'Run deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.clearRuns = async (req, res) => {
  try {
    await QAAgentRun.destroy({ where: { userId: req.user.id } });
    res.json({ message: 'All runs cleared' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
