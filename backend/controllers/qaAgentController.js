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

// ── A11Y-rich pageAnalysis extraction ────────────────────────────────────────
// Regex-based HTML parsing — not as robust as jsdom but zero-dep and fast
// enough for the crawler. Extracts everything the QA Agent prompt needs to
// generate site-specific WCAG 2.2 test cases (lang, landmarks, heading text,
// alt text samples, form label associations, icon-only buttons, skip links,
// ARIA attributes, autocomplete tokens).
function buildPageAnalysis(html) {
  if (!html || typeof html !== 'string') return null;
  const a = {};

  // 1. <html lang="..."> — SC 3.1.1
  const langM = html.match(/<html[^>]*\blang\s*=\s*["']([^"']+)["']/i);
  a.lang = langM ? langM[1].toLowerCase() : null;

  // 2. Doctype
  a.doctype = /<!doctype\s+html/i.test(html) ? 'html5' : null;

  // 3. Meta — description, viewport, canonical
  const metaDesc = html.match(/<meta[^>]*\bname\s*=\s*["']description["'][^>]*\bcontent\s*=\s*["']([^"']*)["']/i);
  const metaViewport = html.match(/<meta[^>]*\bname\s*=\s*["']viewport["'][^>]*\bcontent\s*=\s*["']([^"']*)["']/i);
  const canonical = html.match(/<link[^>]*\brel\s*=\s*["']canonical["'][^>]*\bhref\s*=\s*["']([^"']+)["']/i);
  a.meta = {
    description: metaDesc ? metaDesc[1].trim() : null,
    viewport: metaViewport ? metaViewport[1].trim() : null,
    canonical: canonical ? canonical[1].trim() : null,
  };

  // 4. Landmarks — SC 1.3.1, 2.4.1
  a.landmarks = {
    main: /<main\b|role\s*=\s*["']main["']/i.test(html),
    nav: /<nav\b|role\s*=\s*["']navigation["']/i.test(html),
    header: /<header\b|role\s*=\s*["']banner["']/i.test(html),
    footer: /<footer\b|role\s*=\s*["']contentinfo["']/i.test(html),
    aside: /<aside\b|role\s*=\s*["']complementary["']/i.test(html),
    search: /role\s*=\s*["']search["']/i.test(html),
  };

  // 5. Skip link — SC 2.4.1 (first anchor with href starting with # usually)
  const firstAnchor = html.match(/<a\b[^>]*\bhref\s*=\s*["'](#[^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
  a.skipLink = firstAnchor ? { href: firstAnchor[1], text: stripTags(firstAnchor[2]).slice(0, 60) } : null;

  // 6. Headings — SC 1.3.1, 2.4.6, 2.4.10
  const headings = [];
  const HEADING_RE = /<(h[1-6])\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let hm;
  while ((hm = HEADING_RE.exec(html)) !== null && headings.length < 40) {
    const text = stripTags(hm[2]).slice(0, 120);
    if (text) headings.push({ tag: hm[1].toLowerCase(), text });
  }
  a.headings = headings;
  a.headingCounts = headings.reduce((acc, h) => { acc[h.tag] = (acc[h.tag] || 0) + 1; return acc; }, {});

  // 7. Images — SC 1.1.1. Sample first 20 with their alt text so the LLM
  // can flag placeholder alt like "Banner" / "A featured image for this section"
  const imgs = [];
  const IMG_RE = /<img\b([^>]*)>/gi;
  let im;
  while ((im = IMG_RE.exec(html)) !== null && imgs.length < 20) {
    const attrs = im[1];
    const altM = attrs.match(/\balt\s*=\s*["']([^"']*)["']/i);
    const srcM = attrs.match(/\bsrc\s*=\s*["']([^"']+)["']/i);
    const lazy = /\bloading\s*=\s*["']lazy["']/i.test(attrs);
    const decorative = altM && altM[1] === '';
    imgs.push({
      src: srcM ? srcM[1].slice(0, 120) : null,
      alt: altM ? altM[1].slice(0, 120) : null,
      altMissing: !altM,
      decorative,
      lazy,
    });
  }
  const totalImgRe = html.match(/<img\b/gi);
  const totalImg = totalImgRe ? totalImgRe.length : 0;
  const withAlt = imgs.filter(i => !i.altMissing).length;
  const withoutAlt = imgs.filter(i => i.altMissing).length;
  a.images = {
    total: totalImg,
    withAlt, withoutAlt,
    sample: imgs,
    // Flag placeholder alt text patterns the LLM should catch (SC 1.1.1 quality)
    placeholderAlts: imgs.filter(i => i.alt && /^(banner|image|photo|picture|img|a featured image|logo|graphic|icon)\s*\d*$/i.test(i.alt.trim())).map(i => i.alt),
  };

  // 8. Forms — SC 1.3.1, 1.3.5, 3.3.2, 3.3.8
  const forms = [];
  const FORM_RE = /<form\b([^>]*)>([\s\S]*?)<\/form>/gi;
  let fm;
  while ((fm = FORM_RE.exec(html)) !== null && forms.length < 10) {
    const formAttrs = fm[1];
    const formInner = fm[2];
    const actionM = formAttrs.match(/\baction\s*=\s*["']([^"']*)["']/i);
    const methodM = formAttrs.match(/\bmethod\s*=\s*["']([^"']*)["']/i);
    const fields = [];
    // inputs, textareas, selects
    const FIELD_RE = /<(input|textarea|select)\b([^>]*)(?:>|\/>)/gi;
    let fi;
    while ((fi = FIELD_RE.exec(formInner)) !== null && fields.length < 30) {
      const tag = fi[1].toLowerCase();
      const attrs = fi[2];
      const nameM = attrs.match(/\bname\s*=\s*["']([^"']+)["']/i);
      const idM = attrs.match(/\bid\s*=\s*["']([^"']+)["']/i);
      const typeM = attrs.match(/\btype\s*=\s*["']([^"']+)["']/i);
      const placeholderM = attrs.match(/\bplaceholder\s*=\s*["']([^"']+)["']/i);
      const autocompleteM = attrs.match(/\bautocomplete\s*=\s*["']([^"']+)["']/i);
      const required = /\brequired\b/i.test(attrs);
      const ariaLabelM = attrs.match(/\baria-label\s*=\s*["']([^"']+)["']/i);
      const ariaLabelledbyM = attrs.match(/\baria-labelledby\s*=\s*["']([^"']+)["']/i);
      const ariaDescribedbyM = attrs.match(/\baria-describedby\s*=\s*["']([^"']+)["']/i);
      const ariaInvalidM = attrs.match(/\baria-invalid\s*=\s*["']([^"']+)["']/i);
      const typeVal = typeM ? typeM[1].toLowerCase() : (tag === 'textarea' ? 'textarea' : tag === 'select' ? 'select' : 'text');
      if (typeVal === 'hidden' || typeVal === 'submit' || typeVal === 'button') continue;
      // Is there a <label for="id"> referencing this field?
      let labelAssoc = null;
      if (idM) {
        const labelRe = new RegExp('<label[^>]*\\bfor\\s*=\\s*["\']' + idM[1].replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') + '["\'][^>]*>([\\s\\S]*?)</label>', 'i');
        const lm = formInner.match(labelRe);
        if (lm) labelAssoc = stripTags(lm[1]).slice(0, 60);
      }
      fields.push({
        tag, type: typeVal,
        name: nameM ? nameM[1] : null,
        id: idM ? idM[1] : null,
        placeholder: placeholderM ? placeholderM[1] : null,
        autocomplete: autocompleteM ? autocompleteM[1] : null,
        required,
        label: labelAssoc,                              // visible <label for>
        ariaLabel: ariaLabelM ? ariaLabelM[1] : null,
        ariaLabelledby: ariaLabelledbyM ? ariaLabelledbyM[1] : null,
        ariaDescribedby: ariaDescribedbyM ? ariaDescribedbyM[1] : null,
        ariaInvalid: ariaInvalidM ? ariaInvalidM[1] : null,
        // Final verdict: does this field have a programmatic accessible name?
        hasLabel: !!(labelAssoc || ariaLabelM || ariaLabelledbyM),
      });
    }
    // Submit buttons
    const submitButtons = [];
    const SUBMIT_RE = /<(button|input)\b([^>]*)(?:>([\s\S]*?)<\/button>|\/?>)/gi;
    let sm;
    while ((sm = SUBMIT_RE.exec(formInner)) !== null && submitButtons.length < 5) {
      const attrs = sm[2];
      const typeM = attrs.match(/\btype\s*=\s*["']([^"']+)["']/i);
      const valueM = attrs.match(/\bvalue\s*=\s*["']([^"']+)["']/i);
      if (typeM && /^(submit|button)$/i.test(typeM[1]) || !typeM) {
        const text = sm[3] ? stripTags(sm[3]).slice(0, 40) : (valueM ? valueM[1].slice(0, 40) : '');
        if (text) submitButtons.push(text);
      }
    }
    forms.push({
      action: actionM ? actionM[1].slice(0, 120) : '',
      method: methodM ? methodM[1].toLowerCase() : 'get',
      fields,
      submitButtons,
      fieldsWithoutLabel: fields.filter(f => !f.hasLabel).length,
      fieldsWithoutAutocomplete: fields.filter(f => ['text', 'email', 'tel', 'password'].includes(f.type) && !f.autocomplete).length,
    });
  }
  a.forms = forms;

  // 9. Buttons — especially icon-only (no text content) which fail SC 4.1.2
  const buttons = [];
  const iconOnlyButtons = [];
  const BUTTON_RE = /<button\b([^>]*)>([\s\S]*?)<\/button>/gi;
  let bm;
  while ((bm = BUTTON_RE.exec(html)) !== null && buttons.length < 30) {
    const attrs = bm[1];
    const inner = bm[2];
    const text = stripTags(inner).slice(0, 60);
    const ariaLabelM = attrs.match(/\baria-label\s*=\s*["']([^"']+)["']/i);
    const ariaLabelledbyM = attrs.match(/\baria-labelledby\s*=\s*["']([^"']+)["']/i);
    const titleM = attrs.match(/\btitle\s*=\s*["']([^"']+)["']/i);
    const hasImg = /<img\b|<svg\b|<i\b[^>]*class/i.test(inner);
    const hasText = text.length > 0;
    const hasName = hasText || !!ariaLabelM || !!ariaLabelledbyM;
    const b = {
      text: text || null,
      ariaLabel: ariaLabelM ? ariaLabelM[1] : null,
      title: titleM ? titleM[1] : null,
      iconOnly: hasImg && !hasText,
      hasName,
    };
    buttons.push(b);
    if (b.iconOnly && !b.ariaLabel && !ariaLabelledbyM) iconOnlyButtons.push(b);
  }
  a.buttons = buttons.filter(b => b.text).slice(0, 15).map(b => ({ text: b.text, href: null }));
  a.iconOnlyButtonsWithoutLabel = iconOnlyButtons.length;

  // 10. Links — flag generic link text (SC 2.4.4)
  const allLinks = [];
  const genericLinks = [];
  const navLinks = [];
  const footerLinks = [];
  const LINK_RE = /<a\b([^>]*)\bhref\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let lm;
  let totalInternal = 0, totalExternal = 0;
  while ((lm = LINK_RE.exec(html)) !== null && allLinks.length < 100) {
    const attrs = lm[1];
    const href = lm[2];
    const text = stripTags(lm[3]).slice(0, 80);
    const ariaLabelM = attrs.match(/\baria-label\s*=\s*["']([^"']+)["']/i);
    const isExternal = /^https?:\/\//i.test(href);
    if (isExternal) totalExternal++; else totalInternal++;
    const effectiveText = text || (ariaLabelM ? ariaLabelM[1] : '');
    const generic = effectiveText && /^(click here|read more|learn more|know more|more|details|explore all|view all|see more|here)$/i.test(effectiveText.trim());
    if (generic) genericLinks.push({ text: effectiveText, href });
    allLinks.push({ text: effectiveText, href });
  }
  a.links = { totalInternal, totalExternal };
  a.genericLinks = genericLinks.slice(0, 20);

  // 11. Interactive element types (for prompt context)
  const interactive = [];
  if (forms.length) interactive.push('forms');
  if (/role\s*=\s*["']dialog["']|role\s*=\s*["']alertdialog["']/i.test(html)) interactive.push('dialog');
  if (/role\s*=\s*["']tablist["']/i.test(html)) interactive.push('tabs');
  if (/role\s*=\s*["']menu["']|role\s*=\s*["']menubar["']/i.test(html)) interactive.push('menu');
  if (/role\s*=\s*["']combobox["']/i.test(html)) interactive.push('combobox');
  if (/role\s*=\s*["']listbox["']/i.test(html)) interactive.push('listbox');
  if (/\baria-expanded\b/i.test(html)) interactive.push('disclosure/accordion');
  if (/<video\b|<audio\b/i.test(html)) interactive.push('media');
  if (/<iframe\b/i.test(html)) interactive.push('iframe');
  a.interactive = interactive;

  // 12. ARIA attribute tally (useful for spotting misuse patterns)
  a.ariaTally = {
    hidden: (html.match(/\baria-hidden\s*=\s*["']true["']/gi) || []).length,
    label: (html.match(/\baria-label\s*=/gi) || []).length,
    labelledby: (html.match(/\baria-labelledby\s*=/gi) || []).length,
    describedby: (html.match(/\baria-describedby\s*=/gi) || []).length,
    live: (html.match(/\baria-live\s*=/gi) || []).length,
    expanded: (html.match(/\baria-expanded\s*=/gi) || []).length,
    current: (html.match(/\baria-current\s*=/gi) || []).length,
    role: (html.match(/\brole\s*=/gi) || []).length,
    tabindex: (html.match(/\btabindex\s*=/gi) || []).length,
    tabindexPositive: (html.match(/\btabindex\s*=\s*["'](?:[1-9]|[1-9]\d+)["']/gi) || []).length,
  };

  // 13. Focus-suppression heuristic (very rough — checks inline style)
  a.outlineSuppressed = /outline\s*:\s*(?:none|0)/i.test(html);

  // 14. Autoplay media
  a.autoplayMedia = /<(?:video|audio)\b[^>]*\bautoplay\b/i.test(html);

  return a;
}

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
      // FIX-4: attach rich a11y pageAnalysis so the QA Agent prompt sees
      // real DOM (alts, landmarks, form labels, lang, headings, etc.) and
      // can generate site-specific WCAG 2.2 test cases.
      if (existing && !existing.pageAnalysis) {
        try { existing.pageAnalysis = buildPageAnalysis(html); } catch (_) { /* ignore parse errors */ }
      }

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

// Full runs with testCases for a project (used in project inner page QA Agent tab)
exports.listRunsByProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const runs = await QAAgentRun.findAll({
      where: { projectId },
      order: [['createdAt', 'DESC']],
      limit: 50,
    });
    res.json(runs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateRun = async (req, res) => {
  try {
    const run = await QAAgentRun.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!run) return res.status(404).json({ error: 'Run not found' });
    const body = req.body || {};
    const fields = {};
    for (const k of ['url', 'provider', 'model', 'categories', 'status', 'totalTests', 'passCount', 'failCount', 'blockedCount', 'passRate', 'durationMs', 'results', 'bugs', 'testCases', 'reportHtml', 'projectId']) {
      if (body[k] !== undefined) fields[k] = body[k];
    }
    await run.update(fields);
    res.json(run);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createRun = async (req, res) => {
  try {
    const body = req.body || {};
    const fields = {
      userId: req.user.id,
      clientId: body.clientId || null,
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
    };

    // Upsert: if a run with this clientId already exists for this user, update it
    let run;
    if (body.clientId) {
      run = await QAAgentRun.findOne({ where: { clientId: body.clientId, userId: req.user.id } });
    }
    if (run) {
      await run.update(fields);
    } else {
      run = await QAAgentRun.create(fields);
    }

    await ActivityLog.create({
      action: `QA Agent run saved for ${body.url || 'site'}`,
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
