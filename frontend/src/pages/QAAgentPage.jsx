import { useEffect, useRef, useCallback } from 'react';
import {
  getQAAgentConfig, saveQAAgentConfig,
  listQAAgentRuns, createQAAgentRun, deleteQAAgentRun,
} from '../api/client';

// Map a module run object → backend payload
function runToPayload(r) {
  const tcs = r.tcRows || [];
  const total = r.total || tcs.length || 0;
  return {
    clientId: r.id,
    url: r.url,
    provider: r.provider || null,
    model: r.model || null,
    categories: r.cats || [],
    status: 'completed',
    totalTests: total,
    passCount: r.passCount || 0,
    failCount: r.failCount || 0,
    blockedCount: r.blockedCount || 0,
    passRate: r.passRate || 0,
    durationMs: r.durationMs || null,
    results: { completed: r.completed, counts: r.counts },
    bugs: r.bugs || [],
    testCases: tcs,
    reportHtml: r.reportHtml || null,
  };
}

export default function QAAgentPage({ theme, toast }) {
  const iframeRef = useRef(null);
  const hydratedRef = useRef(false);
  const src = `/qa-agent/index.html?theme=${theme === 'light' ? 'light' : 'dark'}`;

  // Push backend state into the iframe (only sends fields that actually have data)
  const hydrate = useCallback(async () => {
    if (!iframeRef.current?.contentWindow) return;
    try {
      const results = await Promise.allSettled([
        getQAAgentConfig(),
        listQAAgentRuns({ limit: 25 }),
      ]);
      const cfg = results[0].status === 'fulfilled' ? results[0].value.data : null;
      const runs = results[1].status === 'fulfilled' ? results[1].value.data : null;

      const payload = {};
      if (Array.isArray(runs) && runs.length > 0) {
        payload.runs = runs.map(r => ({
          id: r.clientId || `RUN-${new Date(r.createdAt).getTime()}`,
          backendId: r.id,
          url: r.url,
          stype: r.siteType || '',
          cats: r.categories || [],
          total: r.totalTests || 0,
          bugs: 0,
          date: new Date(r.createdAt).toLocaleString(),
          tcRows: r.testCases || [],
          completed: {},
          counts: {},
        }));
      }
      if (cfg?.state && typeof cfg.state === 'object' && Object.keys(cfg.state).length > 0) {
        payload.state = cfg.state;
      }
      if (cfg?.apiKey) payload.apiKey = cfg.apiKey;
      if (cfg?.provider) payload.provider = cfg.provider;

      iframeRef.current.contentWindow.postMessage({
        source: 'qa-agent-host',
        type: 'hydrate',
        data: payload,
      }, '*');
      hydratedRef.current = true;
    } catch (e) {
      console.warn('QA Agent hydration failed', e);
    }
  }, []);

  // Listen for events from the iframe → persist to backend
  useEffect(() => {
    const onMessage = async (ev) => {
      const msg = ev.data;
      if (!msg || msg.source !== 'qa-agent') return;
      try {
        if (msg.type === 'ready') {
          hydrate();
        } else if (msg.type === 'run-saved') {
          await createQAAgentRun(runToPayload(msg.data || {}));
          toast?.('success', 'QA run saved');
        } else if (msg.type === 'run-deleted') {
          // Best-effort: backend uses int IDs; if we don't have one, refresh next hydrate handles it.
          if (msg.data?.backendId) {
            await deleteQAAgentRun(msg.data.backendId);
          }
        } else if (msg.type === 'state-saved') {
          await saveQAAgentConfig({ state: msg.data || {} });
        } else if (msg.type === 'apikey-saved') {
          await saveQAAgentConfig({
            apiKey: msg.data?.apiKey,
            provider: msg.data?.provider,
          });
        } else if (msg.type === 'apikey-removed') {
          await saveQAAgentConfig({ apiKey: null });
        }
      } catch (e) {
        console.warn('QA Agent persist failed', e);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [hydrate, toast]);

  return (
    <div style={{
      height: 'calc(100vh - 120px)',
      background: 'var(--bc)',
      border: '1px solid var(--bd)',
      borderRadius: 14,
      overflow: 'hidden',
      boxShadow: 'var(--shadow)',
    }}>
      <iframe
        ref={iframeRef}
        key={theme}
        src={src}
        title="QA Agent"
        style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
        allow="clipboard-read; clipboard-write"
        onLoad={() => { hydratedRef.current = false; }}
      />
    </div>
  );
}
