# Build a Naukri Resume Auto Updater using Playwright + GitHub Actions

You are a senior Full Stack and Automation Engineer.

Your goal is to build a complete production-ready project while keeping it as simple as possible.

## Primary Goal

Build a browser automation that automatically updates my Naukri profile multiple times a day.

The automation should:

1. Login to my Naukri account.
2. Navigate to my profile.
3. Update my profile summary by intelligently toggling a trailing space.

   * If the summary ends with a space, remove it.
   * Otherwise, add one trailing space.
4. Upload the same resume PDF every run.
5. Save the profile.
6. Take a screenshot after successful completion.
7. Close the browser.

The entire process should be automatic.

---

# Tech Stack

Use ONLY:

* TypeScript
* Node.js
* Playwright
* GitHub Actions
* GitHub Secrets

Do NOT use:

* Docker
* Redis
* RabbitMQ
* Database
* Express
* NestJS
* Selenium
* Puppeteer
* Railway
* Render
* Azure
* AWS
* Any paid service

The project should be as simple as possible.

---

# Project Structure

Create the following structure.

```text
job-profile-automation/

│
├── .github/
│   └── workflows/
│       └── update.yml
│
├── resume/
│   └── Resume.pdf
│
├── screenshots/
│
├── src/
│   └── index.ts
│
├── .gitignore
├── package.json
├── tsconfig.json
├── playwright.config.ts
├── README.md
└── LICENSE
```

No unnecessary folders.

No unnecessary abstractions.

Everything should remain easy to understand.

---

# Code Style

Use

* async/await
* TypeScript
* descriptive variable names
* proper error handling
* comments where needed
* clean formatting

Keep everything inside one file:

```
src/index.ts
```

No splitting into multiple files.

---

# Browser Automation Flow

The automation should perform the following sequence.

Launch Chromium

↓

Go to Naukri login page

↓

Read credentials from environment variables

↓

Login

↓

Wait until dashboard loads

↓

Open Profile page

↓

Locate Summary textbox

↓

Read current text

↓

Toggle trailing space

↓

Save summary

↓

Locate Resume Upload section

↓

Upload

```
resume/Resume.pdf
```

↓

Wait for upload success

↓

Save profile

↓

Take screenshot

↓

Store screenshot inside

```
screenshots/
```

↓

Close browser

---

# Credentials

Never hardcode credentials.

Use

```
NAUKRI_EMAIL

NAUKRI_PASSWORD
```

through environment variables.

Explain how GitHub Secrets are configured.

---

# Resume

The resume should be stored locally as

```
resume/Resume.pdf
```

The Playwright script should upload this exact file.

Use Playwright's recommended file upload API.

---

# Error Handling

If anything fails

* capture screenshot
* print useful logs
* exit with non-zero code

Do not silently ignore failures.

---

# Logging

Print logs similar to:

```
Launching browser...

Logging in...

Navigating to profile...

Updating summary...

Uploading resume...

Saving profile...

Success.

Closing browser.
```

No complicated logging library.

---

# GitHub Actions

Create a workflow named

```
update.yml
```

The workflow should

* run on Ubuntu
* install Node
* install dependencies
* install Playwright browsers
* execute the script

Add scheduled cron jobs.

Initially configure:

* 09:00
* 12:00
* 15:00

Also allow manual execution using:

```
workflow_dispatch
```

Explain how to modify cron expressions later.

---

# README

Generate a professional README containing

Project overview

Features

Technology stack

Folder structure

Installation

Running locally

GitHub Secrets

GitHub Actions

Changing schedule

Updating resume file

Troubleshooting

Screenshots

Future improvements

License

---

# Setup Guide

Provide a beginner-friendly setup guide.

Include every command.

Example

```
npm install

npx playwright install

npm run start
```

Explain exactly what each command does.

---

# GitHub Deployment Guide

Explain everything.

Including

1. Create repository

2. Push code

3. Upload Resume.pdf

4. Configure Secrets

5. Enable GitHub Actions

6. Run manually

7. Verify logs

8. Download screenshots

Do not skip any step.

Assume the user has never used GitHub Actions before.

---

# .gitignore

Generate an appropriate .gitignore.

Explain whether the resume should be committed or ignored.

Recommend the best approach for both private and public repositories.

---

# Playwright Best Practices

Use

* locator()

instead of deprecated APIs.

Use proper waits.

Avoid unnecessary sleeps.

Prefer Playwright's built-in waiting mechanisms.

---

# Selectors

Because websites change frequently, avoid brittle selectors.

Prefer

* labels
* placeholders
* roles
* stable attributes

If a selector cannot be guaranteed, clearly mark it with a TODO comment and explain how to inspect and update it.

---

# Maintainability

At the top of index.ts create a clearly marked section containing all configurable values.

Example

```
LOGIN_URL

PROFILE_URL

RESUME_PATH

SCREENSHOT_PATH

TIMEOUT
```

This should allow future changes without searching through the file.

---

# Final Deliverables

Generate everything required.

* package.json
* tsconfig.json
* playwright.config.ts
* .gitignore
* GitHub Action workflow
* README.md
* Complete TypeScript implementation
* Folder structure
* Setup instructions
* Deployment guide
* Troubleshooting guide

Do not leave placeholders such as "implement later."

The project should be runnable after replacing only:

* Naukri email
* Naukri password
* Resume.pdf

Everything else should work with minimal changes, except for any selector updates that become necessary if the Naukri UI changes.

Whenever you encounter uncertainty about a selector due to website changes, clearly document how to inspect the page using Playwright Inspector or browser DevTools and where to update the selector in the code.
