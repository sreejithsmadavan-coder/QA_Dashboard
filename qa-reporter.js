/**
 * QA Nexus — Playwright Custom Reporter
 * ──────────────────────────────────────
 * Automatically POSTs test results to the QA Nexus dashboard after every run.
 *
 * Usage in playwright.config.js:
 *
 *   reporter: [
 *     ['./qa-reporter.js', {
 *       url:       'http://localhost:5000/api/reports/playwright',
 *       projectId: 1,       // your project ID in QA Nexus
 *       sprint:    'Sprint 6',
 *     }],
 *     ['list'],             // keep the normal console output
 *   ],
 */

const http  = require('http');
const https = require('https');

class QANexusReporter {
  constructor(options = {}) {
    this.url       = options.url       || 'http://localhost:5000/api/reports/playwright';
    this.projectId = options.projectId || null;
    this.sprint    = options.sprint    || 'Sprint 1';
    this.results   = [];
  }

  // Called once when the run starts
  onBegin(config, suite) {
    const total = suite.allTests().length;
    console.log(`\n[QA Nexus] Starting run — ${total} test(s) → project #${this.projectId}, ${this.sprint}`);
  }

  // Called after every individual test
  onTestEnd(test, result) {
    this.results.push({
      title:    test.title,
      status:   result.status,           // 'passed' | 'failed' | 'skipped' | 'timedOut'
      duration: result.duration,         // ms
      error:    result.error?.message || null,
    });
  }

  // Called once when all tests have finished
  async onEnd(result) {
    if (!this.projectId) {
      console.warn('[QA Nexus] ⚠  projectId not set — skipping report upload');
      return;
    }

    const payload = JSON.stringify({
      projectId: this.projectId,
      sprint:    this.sprint,
      results:   this.results,
    });

    try {
      await this._post(payload);
      const p = this.results.filter(r => r.status === 'passed').length;
      const f = this.results.filter(r => r.status === 'failed').length;
      const s = this.results.filter(r => r.status === 'skipped').length;
      console.log(`[QA Nexus] ✓ Report uploaded — ${p} passed · ${f} failed · ${s} skipped`);
    } catch (err) {
      console.error('[QA Nexus] ✗ Failed to upload report:', err.message);
    }
  }

  // ── HTTP helper ────────────────────────────────────────────────────────────

  _post(payload) {
    return new Promise((resolve, reject) => {
      const parsed  = new URL(this.url);
      const lib     = parsed.protocol === 'https:' ? https : http;
      const options = {
        hostname: parsed.hostname,
        port:     parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path:     parsed.pathname + parsed.search,
        method:   'POST',
        headers: {
          'Content-Type':   'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      };

      const req = lib.request(options, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(JSON.parse(data));
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        });
      });

      req.on('error', reject);
      req.write(payload);
      req.end();
    });
  }
}

module.exports = QANexusReporter;
