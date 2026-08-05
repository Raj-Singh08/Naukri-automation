/**
 * =====================================================================
 *  Naukri Resume Auto Updater
 * =====================================================================
 *
 *  Logs into Naukri, toggles a trailing space in the Profile Summary,
 *  re-uploads `resume/Resume.pdf`, saves the profile and stores a
 *  screenshot in `screenshots/`.
 *
 *  Run locally:  `npm start`  (credentials via a local `.env` file, or
 *  NAUKRI_EMAIL / NAUKRI_PASSWORD env vars)
 *  Run on CI:    the GitHub Actions workflow `.github/workflows/update.yml`
 *
 *  Naukri changes its page markup frequently. All selectors live in the
 *  CONFIG section below so you can update them in one place. When a
 *  selector breaks, inspect the live page (README → Troubleshooting)
 *  and refresh the matching entry.
 * =====================================================================
 */

// Loads NAUKRI_EMAIL / NAUKRI_PASSWORD from a `.env` file in the project
// root (if one exists). Explicitly-set environment variables still win,
// and GitHub Secrets are used in CI.
import 'dotenv/config';

import { chromium, type Browser, type Locator, type Page } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

/* =====================================================================
 *  CONFIGURATION — change these values without touching anything else.
 * ===================================================================== */

// Paths are resolved relative to this source file so the script works
// no matter which directory you run it from.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');

// Naukri pages.
const LOGIN_URL = 'https://www.naukri.com/nlogin/login';
const PROFILE_URL = 'https://www.naukri.com/mnjuser/profile';

// URL fragment that proves we landed on the post-login dashboard.
const DASHBOARD_URL_FRAGMENT = '/mnjuser/homepage';

// Resume file and screenshot output.
const RESUME_PATH = path.join(PROJECT_ROOT, 'resume', 'RajSingh Resume.pdf');
const SCREENSHOT_DIR = path.join(PROJECT_ROOT, 'screenshots');

// Waits (milliseconds).
const TIMEOUT = 30_000;        // overall per-action timeout
const SELECTOR_TIMEOUT = 12_000; // how long to hunt for one selector

// When true, the script waits for one of the upload success indicators
// below after uploading the resume. If your Naukri UI does not show any
// of them, set this to false to skip the confirmation step.
const REQUIRE_UPLOAD_CONFIRMATION = true;

// Run with a visible browser window. Keep this false (headless) for CI.
// For local runs, set it to false so you can solve any CAPTCHA / OTP
// Naukri shows by hand:
//   Windows PowerShell: $env:NAUKRI_HEADLESS="false"; npm run start
//   Bash:               NAUKRI_HEADLESS=false npm run start
const HEADLESS = process.env.NAUKRI_HEADLESS !== 'false';

// Drive an installed Chrome/Edge instead of Playwright's bundled Chromium.
// A real browser is far less likely to be flagged by Naukri's bot
// protection (the bundled headless Chromium is easily fingerprinted).
//   Windows PowerShell: $env:NAUKRI_CHANNEL="chrome"; npm run start
//   Bash:               NAUKRI_CHANNEL=chrome npm run start
// Leave unset to keep using the bundled Chromium.
const BROWSER_CHANNEL: 'chrome' | 'msedge' | undefined =
  (process.env.NAUKRI_CHANNEL as 'chrome' | 'msedge' | undefined) ?? undefined;

/**
 * All DOM selectors. Each entry is an ordered list of fallbacks — the
 * first one that appears on the page wins. If a step fails, update the
 * matching entry (README → Troubleshooting explains how to inspect the
 * page with Playwright Inspector / DevTools).
 *
 * TODO(selector): confirm on your account — Naukri A/B-tests layouts and
 * these are the most commonly reported stable hooks.
 */
const SELECTORS = {
  // --- Login page (LOGIN_URL) -------------------------------------------
  emailInput: [
    'input[name="email"]',
    'input[type="text"][placeholder*="Email" i]',
    'input[type="text"]',
  ],
  passwordInput: [
    'input[name="password"]',
    'input[type="password"]',
  ],
  loginButton: [
    'button[type="submit"]',
    'button:has-text("Login")',
  ],

  // --- Profile page (PROFILE_URL) ----------------------------------------
  summaryField: [
    'textarea[name="summary"]',
    'textarea[id="summary"]',
    'textarea[placeholder*="summary" i]',
    'textarea[data-qa*="summary" i]',
  ],
  summaryEditButton: [
    // An "Edit" button inside the container that holds the heading text.
    'xpath=//*[contains(., "Profile Summary")]//button[contains(@aria-label, "Edit") or contains(@title, "Edit") or contains(., "Edit")]',
    'button[title="Edit"]',
    'button[aria-label="Edit"]',
    'button:has-text("Edit")',
  ],
  // "Save" button inside the section editor that is currently open.
  sectionSaveButton: [
    'button:has-text("Save")',
  ],
  // The resume file input. It is usually hidden — that is fine, the
  // Playwright upload API works on hidden inputs.
  resumeFileInput: [
    'input[type="file"][accept*="pdf"]',
    'input[type="file"][name*="resume" i]',
    'input[type="file"][id*="resume" i]',
    'input[type="file"]',
  ],
  // Any visible text that proves the resume upload finished.
  uploadSuccessIndicators: [
    'Resume.pdf',
    'Uploaded',
    'Successfully updated',
  ],
  // The main "Save" button of the profile page.
  profileSaveButton: [
    'button:has-text("Save Profile")',
    'button:has-text("Save")',
    'button[type="submit"]:has-text("Save")',
  ],
} as const;

/* =====================================================================
 *  Helpers
 * ===================================================================== */

/** Returns the first selector that appears on the page; throws otherwise. */
async function locateFirst(
  page: Page,
  selectors: readonly string[],
  description: string,
  state: 'attached' | 'visible' = 'visible',
): Promise<Locator> {
  const tried: string[] = [];
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    try {
      await locator.waitFor({ state, timeout: SELECTOR_TIMEOUT });
      return locator;
    } catch {
      tried.push(selector);
    }
  }
  throw new Error(
    `Could not locate ${description}.\n` +
    `Tried: ${tried.join(' | ')}\n` +
    `Naukri probably changed its page layout. See README → Troubleshooting.`,
  );
}

/** Waits for any one of several visible text indicators. */
async function waitForAnyText(
  page: Page,
  indicators: readonly string[],
  description: string,
): Promise<void> {
  for (const indicator of indicators) {
    try {
      await page.getByText(indicator, { exact: false }).first().waitFor({
        state: 'visible',
        timeout: TIMEOUT,
      });
      return;
    } catch {
      // try the next indicator
    }
  }
  throw new Error(
    `${description}.\n` +
    `None of the success indicators appeared: ${indicators.join(' | ')}.\n` +
    `If the step actually succeeded, update SELECTORS.uploadSuccessIndicators.`,
  );
}

/** A filename-safe timestamp, e.g. 2026-08-05-093015. */
function timestampForFilename(): string {
  const now = new Date();
  const pad = (n: number): string => String(n).padStart(2, '0');
  return (
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-` +
    `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  );
}

async function captureScreenshot(page: Page, filename: string): Promise<void> {
  const filePath = path.join(SCREENSHOT_DIR, filename);
  await page.screenshot({ path: filePath, fullPage: true });
  console.log(`Screenshot saved: ${filePath}`);
}

/* =====================================================================
 *  Steps (one function per step in the flow)
 * ===================================================================== */

function ensurePrerequisites(): void {
  if (!process.env.NAUKRI_EMAIL) {
    throw new Error('Missing environment variable NAUKRI_EMAIL.');
  }
  if (!process.env.NAUKRI_PASSWORD) {
    throw new Error('Missing environment variable NAUKRI_PASSWORD.');
  }
  if (!fs.existsSync(RESUME_PATH)) {
    throw new Error(`Resume not found at ${RESUME_PATH}.`);
  }
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

/**
 * Naukri's bot protection (Imperva/Incapsula) answers automated requests
 * with an HTTP 403 page. If we land on it, fail with an actionable error
 * instead of a confusing "could not locate …" message.
 */
async function throwIfBlocked(page: Page): Promise<void> {
  const bodyText = await page.locator('body').innerText({ timeout: 5_000 }).catch(() => '');
  // Match only the strong Imperva block signatures — a bare "captcha" or
  // "blocked" word can appear on an otherwise-fine page and would cause a
  // false positive.
  const blocked =
    /permission to access|access denied|incapsula|unusual traffic/i.test(bodyText) ||
    page.url().includes('incapsula');

  if (blocked) {
    throw new Error(
      'Naukri blocked the request (HTTP 403 — bot protection / CAPTCHA).\n' +
      'This is Naukri flagging the automated browser, not a problem with your credentials.\n' +
      'For local runs try a real browser in a visible window:\n' +
      '  PowerShell: $env:NAUKRI_HEADLESS="false"; $env:NAUKRI_CHANNEL="chrome"; npm run start\n' +
      '  Bash:       NAUKRI_HEADLESS=false NAUKRI_CHANNEL=chrome npm run start\n' +
      'Then solve any CAPTCHA that appears by hand. In CI, GitHub runner IPs are\n' +
      'often blocked — see README → Troubleshooting.',
    );
  }
}

async function login(page: Page): Promise<void> {
  console.log('Logging in...');

  await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded' });
  await throwIfBlocked(page);

  const emailInput = await locateFirst(page, SELECTORS.emailInput, 'the email input on the login page');
  await emailInput.fill(process.env.NAUKRI_EMAIL!);

  const passwordInput = await locateFirst(page, SELECTORS.passwordInput, 'the password input on the login page');
  await passwordInput.fill(process.env.NAUKRI_PASSWORD!);

  const loginButton = await locateFirst(page, SELECTORS.loginButton, 'the login button');
  await loginButton.click();

  // Naukri redirects to the dashboard after a successful login.
  await page
    .waitForURL((url) => url.pathname.includes(DASHBOARD_URL_FRAGMENT), { timeout: TIMEOUT })
    .catch(() => {
      if (page.url().includes('/nlogin/login')) {
        throw new Error(
          'Login failed — still on the login page. Check NAUKRI_EMAIL / NAUKRI_PASSWORD ' +
          'and whether Naukri is showing a CAPTCHA / OTP wall.',
        );
      }
    });
}

async function navigateToProfile(page: Page): Promise<void> {
  console.log('Navigating to profile...');
  await page.goto(PROFILE_URL, { waitUntil: 'domcontentloaded' });
  // Let the (heavy) profile page settle. Best-effort — never fails the run.
  await page.waitForLoadState('networkidle', { timeout: TIMEOUT }).catch(() => {});
}

/**
 * Locates the summary textarea. If it is not on the page yet, the summary
 * editor is opened via its "Edit" button first.
 */
async function getSummaryField(page: Page): Promise<Locator> {
  try {
    return await locateFirst(page, SELECTORS.summaryField, 'the summary textarea');
  } catch {
    const editButton = await locateFirst(page, SELECTORS.summaryEditButton, 'the summary Edit button');
    await editButton.click();
    return await locateFirst(page, SELECTORS.summaryField, 'the summary textarea (after opening the editor)');
  }
}

async function toggleSummary(page: Page): Promise<void> {
  console.log('Updating summary...');

  const summaryField = await getSummaryField(page);

  const currentSummary = await summaryField.inputValue();
  const toggledSummary = currentSummary.endsWith(' ')
    ? currentSummary.slice(0, -1)  // ends with a space → remove it
    : `${currentSummary} `;        // otherwise → add one trailing space

  await summaryField.fill(toggledSummary);
  console.log(`Summary toggled: ${currentSummary.endsWith(' ') ? 'removed' : 'added'} a trailing space.`);

  const saveButton = await locateFirst(page, SELECTORS.sectionSaveButton, 'the section Save button');
  await saveButton.click();
  console.log('Summary saved.');
}

async function uploadResume(page: Page): Promise<void> {
  console.log('Uploading resume...');

  const fileInput = await locateFirst(page, SELECTORS.resumeFileInput, 'the resume file input', 'attached');
  await fileInput.setInputFiles(RESUME_PATH);
  console.log(`Uploaded ${RESUME_PATH}.`);

  if (REQUIRE_UPLOAD_CONFIRMATION) {
    await waitForAnyText(page, SELECTORS.uploadSuccessIndicators, 'Waiting for the upload to be confirmed');
    console.log('Upload confirmed.');
  }
}

async function saveProfile(page: Page): Promise<void> {
  console.log('Saving profile...');

  const saveButton = await locateFirst(page, SELECTORS.profileSaveButton, 'the main Save button');
  await saveButton.click();

  // Give Naukri a moment to persist the changes before the screenshot.
  await page.waitForLoadState('networkidle', { timeout: TIMEOUT }).catch(() => {});
  console.log('Profile saved.');
}

/* =====================================================================
 *  Entry point
 * ===================================================================== */

async function main(): Promise<void> {
  let browser: Browser | null = null;
  let page: Page | null = null;

  try {
    ensurePrerequisites();

    console.log('Launching browser...');
    browser = await chromium.launch({
      headless: HEADLESS,
      channel: BROWSER_CHANNEL,
      // Remove Chrome's `--enable-automation` behaviour so the renderer
      // looks less like a bot (suppresses navigator.webdriver at launch).
      args: ['--disable-blink-features=AutomationControlled'],
    });
    const context = await browser.newContext({
      viewport: { width: 1366, height: 900 },
      locale: 'en-IN',
      // A realistic user agent so Naukri's bot detection is less likely to trip.
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    });

    // Hide the automation flag exposed on `navigator.webdriver`.
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    page = await context.newPage();
    page.setDefaultTimeout(TIMEOUT);

    await login(page);
    await navigateToProfile(page);
    await toggleSummary(page);
    await uploadResume(page);
    await saveProfile(page);
    await captureScreenshot(page, `success-${timestampForFilename()}.png`);

    console.log('Success.');
  } catch (error) {
    // Capture whatever is on screen so the failure can be debugged.
    if (page) {
      await captureScreenshot(page, `failure-${timestampForFilename()}.png`).catch(() => {
        console.error('Could not capture a failure screenshot.');
      });
    }
    console.error('\nAutomation failed:');
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  } finally {
    console.log('Closing browser.');
    if (browser) {
      await browser.close();
    }
  }
}

main();
