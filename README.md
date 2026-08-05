# Job Profile Automation — Naukri Resume Auto Updater

A tiny, production-ready bot that keeps your Naukri profile fresh automatically, three times a day, using **Playwright + GitHub Actions**. Recruiters sort candidates by "last updated" — this bot makes sure you always appear active, which dramatically improves your profile's visibility and recruiter outreach.

The bot:

1. Logs into your Naukri account.
2. Opens your profile.
3. **Toggles a trailing space** on the Profile Summary (adds one if missing, removes it if present) — a minimal, invisible change that Naukri still registers as a profile update.
4. Re-uploads your resume (`resume/Resume.pdf`).
5. Saves the profile.
6. Takes a screenshot into `screenshots/`.
7. Closes the browser.

Everything runs for free on GitHub's servers. You never touch it again after setup.

---

## Features

- ✅ **Fully automated** — scheduled via GitHub Actions cron (09:00 / 12:00 / 15:00 UTC by default).
- ✅ **Manual trigger** — run it any time from the GitHub UI with one click (`workflow_dispatch`).
- ✅ **Intelligent summary toggle** — adds or removes a trailing space so every run is a *different* update.
- ✅ **Resume re-upload** every run so it stays at the top of the "last updated" list.
- ✅ **Screenshots on success and failure** — stored as a downloadable artifact.
- ✅ **Zero secrets in code** — credentials come from GitHub Secrets / environment variables.
- ✅ **No brittle logic** — all selectors are centralized in one clearly marked config section with fallbacks and an inspection guide.
- ✅ **100% free** — GitHub Actions free tier, no servers, no databases, no paid services.

---

## Technology Stack

| Layer     | Technology                                   |
| --------- | -------------------------------------------- |
| Language  | TypeScript                                   |
| Runtime   | Node.js ≥ 18                                 |
| Browser   | Playwright (Chromium)                        |
| Scheduler | GitHub Actions (cron + workflow_dispatch)    |
| Secrets   | GitHub Secrets (`NAUKRI_EMAIL`, `NAUKRI_PASSWORD`) |

No Docker, databases, or paid services are used.

---

## Folder Structure

```text
job-profile-automation/

├── .github/
│   └── workflows/
│       └── update.yml          # GitHub Actions schedule + steps
│
├── resume/
│   └── Resume.pdf              # the file uploaded on every run
│
├── screenshots/                # created automatically at runtime (git-ignored)
│
├── src/
│   └── index.ts                # the entire automation (single file)
│
├── .gitignore
├── package.json
├── tsconfig.json
├── playwright.config.ts
├── README.md
└── LICENSE
```

Every file has one job; there are no unnecessary folders or abstractions.

---

## Installation (Setup Guide)

You need **Node.js 18+** and **Git** installed on your machine. If you are on Windows, install Node from [nodejs.org](https://nodejs.org) and accept the default options — this also installs `npm`.

### 1. Create the project folder

If you are starting from scratch (not from a cloned repo):

```bash
mkdir job-profile-automation
cd job-profile-automation
```

### 2. Install the project dependencies

```bash
npm install
```

**What this does:** reads `package.json`, downloads `@playwright/test` (the browser-automation library), `typescript`, and `tsx` (a helper that lets you run TypeScript directly) into the `node_modules/` folder, and creates `package-lock.json` so future installs are identical.

### 3. Install the Chromium browser for Playwright

```bash
npx playwright install chromium
```

**What this does:** downloads the Chromium browser that Playwright drives. It only needs to happen once. (On Linux CI this step also installs OS packages — see the workflow.)

### 4. Put your resume in place

Copy your real resume PDF to:

```text
resume/Resume.pdf
```

(Replace the placeholder file that ships with the project.)

### 5. Provide your Naukri credentials

**Option A — `.env` file (easiest, recommended for local runs):**

Create a file named `.env` in the project root with your credentials. A template already exists as `.env.example`:

```bash
cp .env.example .env
```

Then edit `.env`:

```dotenv
NAUKRI_EMAIL=you@example.com
NAUKRI_PASSWORD=YourNaukriPassword
```

`.env` is ignored by git, so your password is never committed. The script loads it automatically via `dotenv` on startup.

**Option B — real environment variables** (useful for one-off runs; these override `.env`):

```powershell
# Windows (PowerShell)
$env:NAUKRI_EMAIL="you@example.com"
$env:NAUKRI_PASSWORD="YourNaukriPassword"
```

```bash
# Windows (Git Bash) / macOS / Linux
export NAUKRI_EMAIL="you@example.com"
export NAUKRI_PASSWORD="YourNaukriPassword"
```

Either way, the script refuses to run if `NAUKRI_EMAIL` / `NAUKRI_PASSWORD` are missing.

### 6. Run it locally

```bash
npm run start
```

**What this does:** executes `src/index.ts` (via `tsx`), launching Chromium headlessly and running the whole flow. If everything works you'll see log lines like:

```text
Launching browser...
Logging in...
Navigating to profile...
Updating summary...
Uploading resume...
Saving profile...
Success.
Closing browser.
```

A screenshot is saved to `screenshots/`.

> **First local run tip:** Naukri blocks plain headless automation. If you hit the 403 bot-protection page (see Troubleshooting), run with a visible browser and your real Chrome:
> - PowerShell: `$env:NAUKRI_HEADLESS="false"; $env:NAUKRI_CHANNEL="chrome"; npm run start`
> - Bash: `NAUKRI_HEADLESS=false NAUKRI_CHANNEL=chrome npm run start`
>
> This lets you solve any CAPTCHA by hand while it runs.

> **Optional type-check:** `npm run typecheck` runs the TypeScript compiler without emitting files, to catch type errors.

---

## GitHub Secrets (credentials, safely)

**Never** put your password in the code or in the README. The automation reads credentials from environment variables, and GitHub Actions supplies them at run time from **Secrets** — encrypted values that only GitHub's runners can read.

1. On GitHub, open your repository → **Settings** → **Secrets and variables** → **Actions**.
2. Click **New repository secret**.
3. **Name:** `NAUKRI_EMAIL`, **Secret:** your Naukri login email. Click **Add secret**.
4. Repeat for `NAUKRI_PASSWORD` with your Naukri password.

The workflow maps them into the job's environment:

```yaml
env:
  NAUKRI_EMAIL: ${{ secrets.NAUKRI_EMAIL }}
  NAUKRI_PASSWORD: ${{ secrets.NAUKRI_PASSWORD }}
```

Secrets are hidden from everyone — you can update them any time, and any later runs automatically use the new values. If you change your Naukri password, update the secret here (and, if you ran locally, your shell variable).

---

## GitHub Actions

`.github/workflows/update.yml` defines a single job that runs on Ubuntu:

| Step | What it does |
| ---- | ------------ |
| `actions/checkout@v4` | Downloads your repository code onto the runner. |
| `actions/setup-node@v4` | Installs Node.js 20 (and caches npm packages). |
| `npm ci` | Installs dependencies exactly as recorded in `package-lock.json`. |
| `npx playwright install --with-deps chromium` | Downloads Chromium **plus** the Linux system libraries it needs. |
| `npm run start` | Runs the automation with your secrets. |
| `actions/upload-artifact@v4` | Uploads everything in `screenshots/` as a downloadable artifact — even if the run failed. |

The job has a 15-minute timeout so a stuck run can't burn runner time.

---

## Changing the Schedule

The schedule lives at the top of `.github/workflows/update.yml`:

```yaml
schedule:
  - cron: '0 9 * * *'   # 09:00
  - cron: '0 12 * * *'  # 12:00
  - cron: '0 15 * * *'  # 15:00
```

Cron format is: **minute hour day-of-month month day-of-week** (UTC).

Common examples:

| Expression     | Meaning                              |
| -------------- | ------------------------------------ |
| `0 9 * * *`    | Every day at 09:00 UTC               |
| `30 18 * * *`  | Every day at 18:30 UTC               |
| `0 */4 * * *`  | Every 4 hours (top of the hour)      |
| `0 10 * * 1-5` | 10:00 UTC on weekdays only           |

To change the times, edit the lines, commit, and push — the new schedule applies automatically. **Note:** GitHub Actions cron uses **UTC**. For Indian Standard Time, subtract 5h 30m: 09:00 IST → `30 3 * * *`, 12:00 IST → `30 6 * * *`, 15:00 IST → `30 9 * * *`.

> GitHub only guarantees that scheduled workflows run *around* their cron time, and if a repository is inactive for 60 days, scheduled runs stop. In both cases the **Run workflow** button still works.

---

## Updating the Resume File

1. Replace the resume PDF with your latest version.
2. Make sure the filename matches the `RESUME_PATH` constant in the **CONFIGURATION** section at the top of `src/index.ts` (the default is `resume/Resume.pdf` — if you use your own filename, like `resume/RajSingh Resume.pdf`, update `RESUME_PATH` to match).
3. Commit and push.

```bash
git add resume/Resume.pdf
git commit -m "Update resume"
git push
```

The next scheduled run (or a manual run) uploads the new file.

### Should the resume be committed or ignored?

**Private repository (recommended):** **commit** the resume. The workflow checks out the repository onto the runner, so the file must be present in the repo for the upload to work. `.gitignore` is set up so the resume is tracked by default.

**Public repository:** **do not commit** your resume — a public repo means the file is publicly downloadable. Uncomment the `resume/Resume.pdf` line in `.gitignore` to ignore it. The trade-off: the scheduled upload will then *fail* because the file isn't on the runner. Realistic options for a public repo:

- Keep the repo **private** (free for personal use) — simplest and safest.
- Keep the automation in a private repo and manage the resume file another way.

Our strong recommendation: **use a private repository.**

---

## Troubleshooting

### Log says "Could not locate …" / a selector stopped working

Naukri changes its page markup frequently. All selectors live in one clearly marked block at the top of `src/index.ts` (the `SELECTORS` constant). Each entry is an ordered list of fallbacks.

**How to find the right selector (two ways):**

1. **Playwright Inspector (easy):** start it with the browser visible and open the page:

   ```bash
   npx playwright codegen https://www.naukri.com/mnjuser/profile
   ```

   A browser window and a "Playwright Inspector" panel open. Click around the page; the panel records the actions and suggests selectors for the elements you click. Click the selector shown, paste the robust one (prefer `role`, `name`, `placeholder`, `label` over fragile CSS classes) into the matching entry in `SELECTORS`.

2. **Browser DevTools (manual):** open the page in Chrome/Edge, right-click the element (e.g. the summary text box), choose **Inspect**. In the Elements panel, right-click the node → **Copy → Copy selector** (or **Copy JS path**). Tune it to be stable (an `id` or `name` attribute is ideal; avoid long, generated class names).

Then update the entry in `src/index.ts`, and either push (CI) or run locally. Every "could not locate" error message lists exactly which selectors were tried, so you know which entry to fix.

### "You don't have permission to access this URL on this server" (403)

This is Naukri's **bot protection** (Imperva/Incapsula) rejecting the automated browser — it is **not** a problem with your account or credentials. It flags headless / fresh-profile browsers, and it also blocks most **datacenter IPs** (including GitHub Actions runners).

Fix order for **local** runs:

1. Run with your real browser in a visible window so you can solve any CAPTCHA by hand:
   - PowerShell: `$env:NAUKRI_HEADLESS="false"; $env:NAUKRI_CHANNEL="chrome"; npm run start`
   - Bash: `NAUKRI_HEADLESS=false NAUKRI_CHANNEL=chrome npm run start`
   - Use `msedge` instead of `chrome` if you have Edge but not Chrome.
2. Log in once in that window (enter any OTP/CAPTCHA manually). The browser stays open during the run.
3. If Naukri still blocks you, the IP you are on is flagged — try another network (mobile hotspot, office/home), and wait a while before retrying to avoid rate-limit locks.

For **GitHub Actions (CI)**: runner IPs are datacenter IPs, and Naukri blocks them far more aggressively. Expect intermittent 403s on scheduled runs. Mitigations, in order of practicality:

- Accept partial success — the run reports `Automation failed` (screenshot captured) when blocked, and the next run may get through.
- If your home IP is reliably allowed (you verified a local headed run works), consider running the job **manually / on a schedule you control** rather than expecting flawless CI runs. Naukri does not provide an official API for profile updates, so some level of instability is inherent to this approach.

The script now detects the block page and prints this explanation with the exact commands to try — you no longer see a generic selector error.

### Log says "Missing environment variable NAUKRI_EMAIL"

You didn't set the credentials. Locally, put them in `.env` (see Installation → step 5) or export them in your shell. In CI, set them as **GitHub Secrets**.

### Log says "Login failed — still on the login page"

- Wrong `NAUKRI_EMAIL` / `NAUKRI_PASSWORD`.
- Naukri is showing a **CAPTCHA or OTP wall**. Headless automation cannot solve these. When this happens, log in manually once in a normal browser to satisfy Naukri, then re-run; occasionally Naukri flags datacenter IPs and the run may need to be retried later.
- Two-factor authentication (2FA) is enabled on your account — the automation cannot enter the code. Consider a separate account or disable 2FA for automation (not recommended) — see "Future improvements".

### Log says "Resume not found at …"

`resume/Resume.pdf` is missing on the runner. Commit the file (private repo) or re-add it and push.

### Log says upload was not confirmed

The resume likely uploaded fine, but none of the "success indicators" (`Resume.pdf`, `Uploaded`, `Successfully updated`) matched. If you can see the file was uploaded, update `SELECTORS.uploadSuccessIndicators` — or set `REQUIRE_UPLOAD_CONFIRMATION = false` in the config section.

### Screenshots are missing

`actions/upload-artifact` only uploads when files exist. A failure screenshot is always attempted — check the **screenshots** artifact on the run's summary page, and the `screenshots/` folder for local runs.

### GitHub Actions scheduled runs never fire

- The repository may have been inactive for 60+ days (GitHub pauses scheduled workflows). Click **Run workflow** to run it manually.
- Check the workflow is on the default branch and that **Actions** is enabled for the repo (see Deployment Guide).

---

## Screenshots

Every run stores a screenshot under `screenshots/`:

- `success-YYYYMMDD-HHMMSS.png` — after the profile is saved.
- `failure-YYYYMMDD-HHMMSS.png` — whenever anything throws, capturing whatever was on screen.

In CI these are zipped and attached to the workflow run as the **screenshots** artifact (see Deployment Guide → step 8). Local runs write them directly into the folder.

---

## GitHub Deployment Guide (first time)

Assumes you have never used GitHub Actions. All eight steps.

### 1. Create the repository

1. Go to [github.com/new](https://github.com/new).
2. **Repository name:** `job-profile-automation` (or anything you like).
3. **Visibility:** choose **Private** (strongly recommended — your resume and automation logic stay private).
4. Do **not** tick "Add a README", ".gitignore" or "license" (this project already has them).
5. Click **Create repository**.

### 2. Push the code

In your local project folder:

```bash
git init
git add .
git commit -m "Initial commit: Naukri resume auto updater"
git branch -M main
git remote add origin https://github.com/<your-username>/job-profile-automation.git
git push -u origin main
```

(Replace the URL with the one GitHub shows on your new repository page.) Refresh the GitHub page — your files are now in the repo.

### 3. Upload Resume.pdf

Replace `resume/Resume.pdf` with your real resume, then:

```bash
git add resume/Resume.pdf
git commit -m "Add resume"
git push
```

### 4. Configure Secrets

1. Repository → **Settings** → **Secrets and variables** → **Actions**.
2. Click **New repository secret**.
3. Name: `NAUKRI_EMAIL` → paste your email → **Add secret**.
4. Repeat: name `NAUKRI_PASSWORD` → paste your password → **Add secret**.

### 5. Enable GitHub Actions

Actions is on by default for new repositories. To confirm: repository → **Actions** tab. You should see the **Update Naukri Profile** workflow listed (it may show a first run already queued).

If you see "Actions are disabled", go to **Settings → Actions → General** and choose **Allow all actions and reusable workflows**.

### 6. Run manually

1. Go to the **Actions** tab.
2. Click **Update Naukri Profile** on the left.
3. Click the **Run workflow** button on the right (drop-down already says "Branch: main").
4. Click the **green** Run workflow confirmation.

A new run appears at the top. It will also start on its own at 09:00 / 12:00 / 15:00 UTC.

### 7. Verify the logs

Click the run, then click the **Run profile automation** step. You'll see the full console output:

```text
Launching browser...
Logging in...
Navigating to profile...
Updating summary...
Summary toggled: added a trailing space.
Summary saved.
Uploading resume...
Uploaded E:\...\resume\Resume.pdf.   # on CI: /home/runner/.../resume/Resume.pdf
Upload confirmed.
Saving profile...
Profile saved.
Screenshot saved: ...
Success.
Closing browser.
```

A green ✓ next to every step means the run succeeded.

### 8. Download the screenshots

On the run summary page, scroll to the bottom — under **Artifacts** you'll find **screenshots**. Click it to download a ZIP containing the screenshot(s) of that run. This is how you confirm the profile actually saved.

---

## Selectors at a Glance

All selectors are in the `SELECTORS` constant at the top of `src/index.ts`, ordered as fallback lists (first match wins):

| Purpose                 | Where                                | Primary selector(s)                          |
| ----------------------- | ------------------------------------ | -------------------------------------------- |
| Email input             | login page                           | `input[name="email"]`                        |
| Password input          | login page                           | `input[name="password"]`                     |
| Login button            | login page                           | `button[type="submit"]`                      |
| Summary textarea        | profile page                         | `textarea[name="summary"]` (with fallbacks)  |
| Summary Edit button     | profile page (if editor is closed)   | XPath near "Profile Summary" heading         |
| Resume file input       | profile page (hidden is OK)          | `input[type="file"][accept*="pdf"]`          |
| Upload confirmation     | after upload                         | visible text `Resume.pdf` / `Uploaded`       |
| Main Save button        | profile page                         | `button:has-text("Save Profile")`            |

Naukri A/B-tests layouts, so if one entry stops working, inspect the live page (see Troubleshooting) and refresh that entry — nothing else needs to change.

---

## Future Improvements

Ideas, in order of value:

- **Failure alerts** — notify yourself via email/Telegram/Slack when a run fails. GitHub lets you enable email notifications for failed workflow runs, which is free and needs no code.
- **Distribute run times** — run at slightly different minutes each slot to spread load and reduce the chance Naukri rate-limits the account.
- **OTP / 2FA handling** — not currently possible headlessly; if Naukri starts requiring it, revisit with a secure side channel.
- **Run more times a day** — add more cron lines (the "update every N hours" pattern) once you confirm the account isn't flagged.
- **A second summary variation** — rotate among a few pre-approved summary texts instead of just a trailing space (keep changes meaningful).
- **Playwright Report / HTML trace** — capture a trace on failure (`trace: 'retain-on-failure'`) for easier debugging.

---

## License

[MIT](LICENSE)
