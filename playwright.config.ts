import { defineConfig } from '@playwright/test';

/**
 * Playwright configuration.
 *
 * The automation in `src/index.ts` runs Chromium directly via
 * `chromium.launch()`, so it does not depend on this file — but it keeps
 * the project Playwright-first and gives you a single place to tweak
 * default browser behaviour (viewport, timeout, headless mode).
 */
export default defineConfig({
  timeout: 120_000,
  use: {
    headless: true,
    viewport: { width: 1366, height: 900 },
  },
});
