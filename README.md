# MVP Website

[![CI](https://github.com/OWNER/REPO/actions/workflows/ci.yml/badge.svg)](https://github.com/OWNER/REPO/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/mvp-website.svg)](https://www.npmjs.com/package/mvp-website)
[![Coverage Status](https://coveralls.io/repos/github/OWNER/REPO/badge.svg?branch=main)](https://coveralls.io/github/OWNER/REPO?branch=main)

## 🤖 Codex Integration

Before you run any Codex-driven prompts, always sync your code and Hugging Face Space:

```bash
bash scripts/sync-space.sh
```

This ensures Codex sees the latest local changes and model artifacts.

This repository contains the early MVP code for print2's website and backend.

- Frontend HTML pages are in the repository root.
- General backend code is in the `backend/` folder.

- The backend communicates with the Sparc3D API service.
- The `img/` folder is now reserved strictly for image assets.
- HTML files in the `uploads/` directory should use the `.links` extension to avoid being served as plain text.

## Quick Start

Run `docker compose up` to start the API and Postgres services.

## Local Setup

1. Copy `.env.example` to `.env` in the repository root and update the values:
   - `DB_URL` – connection string for your PostgreSQL database.

- `STRIPE_TEST_KEY` – test secret key for Stripe.
- `STRIPE_LIVE_KEY` – live secret key for Stripe.
- `STRIPE_PUBLISHABLE_KEY` – publishable key for Stripe.js on the frontend.
- `STRIPE_WEBHOOK_SECRET` – signing secret for Stripe webhooks.
- `HUNYUAN_API_KEY` – key for the Sparc3D API.
- `HF_TOKEN` – Hugging Face access token used by scripts like `setup_space.sh`.
- `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` – credentials for S3 uploads.

The server uses `STRIPE_LIVE_KEY` when `NODE_ENV=production`; otherwise `STRIPE_TEST_KEY` is used.

- If `STRIPE_TEST_KEY` isn't set, `npm run setup` generates a temporary dummy key
  so local installs don't fail.
- The repository uses `mise` for toolchain management. The included `.mise.toml` enables
  automatic Node version detection via `.nvmrc`. If you don't have `mise` installed,
  run `bash scripts/install-mise.sh` before continuing. After cloning, run `mise trust`
  if you see warnings about untrusted config files. The setup script also configures
  `mise settings add idiomatic_version_file_enable_tools node` to remove the
  `deprecated [idiomatic_version_file_enable_tools]` message. If the warning
  persists, run that command manually.
- `SENDGRID_API_KEY` – API key for sending email via SendGrid.
- `SENTRY_DSN` – connection string for sending errors to Sentry.
- `EMAIL_FROM` – address used for the "from" field in outgoing mail.
- Optional: `PORT` and `HUNYUAN_PORT` to override the default ports for the
  Sparc3D service.
- Optional: `HUNYUAN_SERVER_URL` if your Sparc3D API runs on a custom URL.
- Optional: `DALLE_SERVER_URL` if the DALL-E server runs on a custom URL.

2. Install all dependencies and the Playwright browsers:

   ```bash
   npm run setup
   ```

   This script runs `npm ci` in the root and `backend/`, then downloads the browsers
   required for the end-to-end tests. Set `SKIP_PW_DEPS=1` to skip the
   Playwright dependency installation when the browsers are already available.
   If the dependencies are missing, the script installs them even when
   `SKIP_PW_DEPS` is set so new environments don't fail.
   It also installs the Husky git hooks used for pre-commit checks. If the hooks
   are missing, run `npx husky install` manually.
   If `npm ci` fails with an `EUSAGE` error complaining about missing lock file entries,
   run `npm install` in the affected directory and re-run this setup step.
   Ensure your environment can reach `https://registry.npmjs.org`,
   `https://cdn.playwright.dev`, and `http://archive.ubuntu.com`. The setup
   script downloads packages, browsers, and system libraries from these domains,
   so network restrictions may cause it to fail.

3. Verify your environment and test pipeline:

   ```bash
   npm run diagnose
   ```

   This starts the dev server, runs a sample generation through `/api/generate`,
   and executes the Jest suite. Use it if setup succeeds but subsequent commands
   fail.

4. Initialize the database:

   ```bash
   cd ..
   npm run init-db
   ```

5. Create an admin user (optional):

   Set `ADMIN_USERNAME` and `ADMIN_PASSWORD` in your `.env` file or as environment
   variables, then run:

   ```bash
   npm run create-admin  # inside backend/
   ```

6. Configure the admin token used by protected endpoints:

   Add `ADMIN_TOKEN=yoursecret` to `.env`. You can authenticate either by sending
   this token in the `x-admin-token` header or by logging in with the admin
   account and including the returned JWT in the `Authorization` header.

7. Start the servers in separate terminals:

   ```bash
   npm start            # inside backend/
   cd dalle_server && npm start  # inside backend/dalle_server/
   ```

8. (Optional) Run the purchase reminder job periodically:

   ```bash
   npm run send-reminders  # inside backend/
   ```

9. (Optional) Send discount offers to abandoned checkouts:

   ```bash
   npm run send-abandoned-offers  # inside backend/
   ```

10. (Optional) Clean up expired password reset tokens periodically:

```bash
npm run cleanup-tokens  # inside backend/
```

## Development Container

You can build a dev container from the included `Dockerfile`. The image now
installs the Docker CLI so commands like `docker --version` work inside the
container. If you want to skip running full CI inside the container, build with
`SKIP_TESTS=1`:

```bash
DOCKER_BUILDKIT=1 docker build --build-arg SKIP_TESTS=1 .
```

If the build fails while installing Playwright browsers, the apt package lists
may be stale. Re-run the build with `--no-cache` or `--pull` to refresh the base
image:

```bash
DOCKER_BUILDKIT=1 docker build --no-cache .
```

Make sure any `HTTP_PROXY` or `HTTPS_PROXY` variables are unset so apt can
download packages without proxy interference.

## Serving the Frontend Locally

`index.html` and `payment.html` use ES module scripts. When opened directly from
the filesystem (e.g. with a `file://` URL) the browser blocks these modules and
nothing loads. Run a lightweight web server in the repository root and open the
pages through `http://localhost` to avoid this issue. Two easy options are:

```bash
npx http-server      # Node.js
# or
python -m http.server
```

Then navigate to `http://localhost:8080/index.html` or
`http://localhost:8080/payment.html`.

When the backend server runs on a different port (the default is 3000),
set `window.API_ORIGIN` in the page so the frontend knows where to send API
requests:

```html
<script>
  window.API_ORIGIN = "http://localhost:3000";
</script>
```

Include this snippet before loading any of the JavaScript modules.

## Uploading Reference Images

Images can be added via drag-and-drop in the generator page.

## Managing Subreddit Quotes

Quotes shown on the landing page are stored in
`backend/subreddit_models.json`. Each entry is an object with three
fields:

```json
{
  "subreddit": "art",
  "glb": "models/reddit_art.glb",
  "quote": "Create artistic masterpieces<br />with print3!"
}
```

Add new entries to the JSON file to support more subreddits or multiple
quotes for the same subreddit. When the page loads with
`?sr=subredditname`, the server responds with a random matching entry
and the quote is inserted automatically.

## User Profiles API

Two new routes expose profile information:

- `GET /api/profile` – retrieve the currently authenticated user's profile.
- `GET /api/users/:username/profile` – fetch a public profile for any user.

Profiles are stored in the `user_profiles` table. After pulling the latest code
run the migration to create this table:

```bash
cd backend
npm run migrate
```

### Discount Codes

Promotional discount codes are stored in the `discount_codes` table. Run the
database migrations after updating your local checkout to ensure this table
exists:

```bash
cd backend
npm run migrate
```

### Password Reset

If `SENDGRID_API_KEY` and `EMAIL_FROM` are not set, reset emails are logged to stdout.

Password reset tokens are stored in the `password_resets` table. After pulling
the latest code, run the migrations so this table exists:

```bash
cd backend
npm run migrate
```

Trigger a password reset email by sending a `POST` request to
`/api/request-password-reset` with a JSON body containing `{ "email": "user@example.com" }`.
The email includes a link to `reset-password.html?token=...`.
Complete the flow by `POST`ing `{ "token": "...", "password": "newpass" }` to
`/api/reset-password`.

### One-Click Checkout

The model viewer page includes a **Buy Now** button for fast purchasing. When a
logged-in user has shipping details saved in their profile, clicking **Buy Now**
submits the order immediately and redirects to the Stripe checkout page.

### Drag-and-Drop Image Uploads

Users can drag and drop image files onto the upload area on `index.html`.

### Payment Page Model Controls

Hide the left and right arrow buttons on `payment.html`'s `.glb` viewer when the
basket contains only one item.

## Sharing API

Models can be shared publicly via unique slugs.

- `POST /api/models/:id/share` – create a share link for a model.
- `GET /api/shared/:slug` – retrieve metadata for a shared model.
- Visiting `/shared/:slug` returns an HTML page with Open Graph meta tags that
  redirect to `share.html` for viewing.
- Item cards in **Community Creations** now include a share icon that copies a
  referral link like `https://prints3.com/item/<ID>?ref=<CODE>` to the clipboard.
  Signups via this link grant both parties a £3 discount code. The referrer's
  code is stored in their incentives list while the new user's code is returned
  from `/api/referral-signup` for display after signup.

## Model Lists

Two endpoints provide lists of model jobs:

- `GET /api/my/models`
- `GET /api/users/:username/models`

Both accept optional `limit` and `offset` query parameters to paginate results.
If omitted, the API returns up to 10 most recent models starting from offset 0.

## Captioning Workflow

The backend can generate a short title for each model using a separate caption
service. Start this service alongside the main server:

```bash
npm run caption-service  # inside backend/
```

Once running, the caption service listens on `localhost:5001`. When a job
finishes generating, the backend sends the snapshot image to this service for a
descriptive sentence. That caption is then condensed into a short title by
`utils/generateTitle.js`, which takes the first three unique words from the
caption and capitalizes them. The result is stored in the `generated_title`
column of the `jobs` table.

## Contributing

We welcome pull requests! Please fork the repo and create a topic branch. Run
See [CONTRIBUTING.md](CONTRIBUTING.md) for our branch and commit conventions.
`npm run setup` in the repository root to install all dependencies, then ensure `npm test` runs
clean before submitting.
Run `npm run test-ci` for the same tests using a single process, which matches the CI configuration.
Run `npm run format` in `backend/` to apply Prettier formatting before committing.
For significant changes, please open an issue first to discuss what you would like to change. Be sure to follow the code style enforced by Prettier.

## Using Codex

We sometimes rely on automated agents (such as the Codex agent) to make small
changes. Agents must follow the steps in [AGENTS.md](AGENTS.md) before opening a
pull request:

1. Install dependencies with `npm run setup` in the repository root.
2. Run `npm run format` in `backend/`.
3. Run `npm test` in `backend/` and include the results in the PR description.

4. Check your diff with `git status --short` to verify no unrelated files were
   modified.
5. Add the format and test logs to the PR so reviewers can confirm.
6. If you add new binary asset types (like fonts or archives), update
   `.gitattributes` so Git treats them as binary. This prevents Codex from
   failing to create a patch.

## Running Tests

Install dependencies and Playwright browsers:

```bash
npm run setup
```

If `npm run ci` fails with messages like `TAR_ENTRY_ERROR` or missing files in
`node_modules`, rerun `npm run setup`. The setup script cleans the npm cache and
reinstalls packages to recover from corrupted installs.

If the browsers are missing, the CI scripts will automatically invoke this
command for you. Running it manually first speeds up subsequent test runs.

Run the full CI suite for linting, type checks, backend tests and accessibility checks:

```bash
npm run ci
```

For a quick end-to-end sanity check, run:

```bash
npm run smoke
```

To run Jest directly from the repository root, use:

```bash
npm run jest -- --runInBand --silent
```

If you encounter environment issues running backend tests, use the helper script
below. It sets Node 20, validates the environment and saves output to
`/tmp/test.log`:

```bash
./scripts/test-backend.sh
```

This script automatically runs Jest in `backend/`, so passing `--prefix` is unnecessary.

### Pre-commit Hook

Husky installs a pre-commit hook that runs lint-staged. Staged `*.js`, `*.ts`,
and `*.json` files are formatted with Prettier, backend JavaScript is linted
with ESLint, and Jest runs against related tests.

Avoid calling `npx playwright test` directly. Missing browsers can cause
`"Playwright Test did not expect test() to be called here"` errors.

### Coverage Reports

Run coverage after installing dependencies:

```bash
npm run setup
npm run coverage

cat coverage/lcov.info | npx coveralls
```

Using `npx coveralls` ensures the CLI runs even if it's not installed globally.
By piping the generated `lcov.info` file instead of test output we avoid
`Failed to parse string` errors from Coveralls when console logs appear.
Running coverage without installing dependencies or omitting `npx` may lead to
`coveralls: command not found` or `jest: not found` errors.

#### Troubleshooting

If Coveralls fails with an `lcovParse` error, the `lcov.info` report may contain
ANSI color codes. Strip them before uploading:

```bash
npx strip-ansi coverage/lcov.info > cleaned.info
cat cleaned.info | npx coveralls
```

Verify the file includes `SF:` entries to confirm it's valid:

```bash
grep '^SF:' coverage/lcov.info | head
```

Missing `SF:` lines usually mean the report was truncated. Re-run `npm run coverage`
to regenerate the file.

## Printer Service

The print worker posts completed jobs to an external printer API. See
[docs/printer_api.md](docs/printer_api.md) for the expected request format.

## TODO List

All open tasks are tracked in [docs/task_list.md](docs/task_list.md).

## Automated Agent Coordination

This repository includes scripts and workflows to help Codex agents work together.
See [AGENT_PROTOCOL.md](AGENT_PROTOCOL.md) for the full protocol. Before making any
changes, set `GITHUB_TOKEN` and `GITHUB_REPOSITORY` in your environment and run:

```bash
python scripts/update_locks.py
```

This populates `CURRENT_LOCKS.json` with the files modified by all open PRs.
The file maps each PR number to the list of paths it touches.
Agents must consult this file and avoid modifying paths locked by other PRs.
The `update_locks` workflow keeps it up to date every few minutes. Pull requests
are automatically rebased and merged via the merge queue when CI passes.

## Code Owners

This repository uses a `CODEOWNERS` file to automatically request reviews. The file lives at `.github/CODEOWNERS`, mapping paths to the appropriate teams so review responsibilities stay clear.

## Flaky test quarantine

The `test:stability` script runs the backend test suite three times in a row to
detect unstable tests:

```bash
npm run test:stability
```

Any failures will halt CI, prompting investigation. Individual flaky tests can
be wrapped with `jest-retries` to retry a few times before failing.

## Security Scans

To enable Snyk checks in CI, add `SNYK_TOKEN` in your GitHub repository secrets.
If no token is provided, CI falls back to `npm audit --audit-level=high`.

## i18n Linting

Run `npm run i18n:lint` to verify email translation keys. CI fails if any keys
are missing or unused.

## Package Deduplication

CI runs `npm run deps:dedupe-check` which executes `npm dedupe --dry-run` to
ensure no duplicate packages remain in the lockfiles. Run `npm run deps:dedupe`
locally to automatically deduplicate.

## Deployment

Before deploying with the Netlify CLI, run the helper script to verify that your
environment is configured correctly:

```bash
scripts/netlify-preflight.sh
```

The script checks that `NETLIFY_AUTH_TOKEN` and `NETLIFY_SITE_ID` are defined.
If either variable is missing, deployment stops with a clear error.

Use the Netlify CLI via `npx netlify-cli` or the
[`netlify/actions/cli`](https://github.com/netlify/actions) action and then
run `netlify deploy` as usual once the preflight passes.

## Cost Alerts

The Terraform configuration sets up a budget that emails you if monthly AWS spend exceeds $20. Set `COST_ALERT_EMAIL` before running `terraform apply` to receive these notifications.

## Troubleshooting

### dpkg was interrupted

If you encounter the message `dpkg was interrupted, you must manually run 'dpkg --configure -a' to correct the problem`, run:

```bash
sudo dpkg --configure -a
```

This resolves any partially configured packages left over from an interrupted `apt` operation.

### "Cannot find module '@eslint/js'"

If `eslint` fails with this error, it usually means dependencies aren't installed.
Run `npm run setup` in the repository root to install them.

### ENOTEMPTY errors from npm

If `npm` reports `ENOTEMPTY: directory not empty` while cleaning the cache, remove the
cache directory manually:

```bash
rm -rf "$(npm config get cache)/_cacache"
```

The `npm run setup` script now performs this cleanup before and after installing
dependencies, so new clones shouldn't hit this error. If you still encounter it,
re-run `npm run setup` to ensure the cache directory is cleared.

### Playwright host validation warnings

If Playwright prints a message like `Host system is missing dependencies to run browsers`,
install the required system packages with:

```bash
CI=1 npx playwright install --with-deps
```

This fetches the missing libraries via `apt` so the browsers can start correctly.

## Contributing

⚠️ **Note:** this project uses OpenAI Codex to generate PRs;
binary files (images, compiled objects, etc.) will cause errors.
Please remove or exclude any binary assets before opening a PR.
See [CONTRIBUTING.md](CONTRIBUTING.md) for details on our workflow.

## Performance

### Performance Testing

We include a simple load-test script:

```bash
npm run perf-events

This will fire 1,000 requests at /v2/events with 50 concurrent connections; adjust parameters in scripts/perf-events.js.
```
