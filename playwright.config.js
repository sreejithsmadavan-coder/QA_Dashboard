// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * QA Nexus — example Playwright config with auto-reporting to dashboard.
 *
 * Run:  npx playwright test
 * After the run, results are automatically POSTed to the QA Nexus API and
 * the dashboard updates in real time.
 *
 * Change projectId and sprint to match your project in QA Nexus.
 */
module.exports = defineConfig({
  testDir: './e2e',       // put your .spec.ts / .spec.js files here
  timeout: 30_000,
  retries: 0,

  reporter: [
    // ── QA Nexus live reporter ───────────────────────────────────────────────
    ['./qa-reporter.js', {
      url:       process.env.QA_NEXUS_URL || 'http://localhost:5000/api/reports/playwright',
      projectId: process.env.QA_PROJECT_ID ? Number(process.env.QA_PROJECT_ID) : 1,
      sprint:    process.env.QA_SPRINT    || 'Sprint 1',
    }],
    // ── keep normal console output ───────────────────────────────────────────
    ['list'],
  ],

  use: {
    baseURL:       process.env.BASE_URL || 'http://localhost:5173',
    headless:      true,
    screenshot:    'only-on-failure',
    video:         'retain-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
