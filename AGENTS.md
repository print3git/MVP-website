# AGENT GUIDELINES

These guidelines apply to all automated agents (e.g. the Codex agent) working on this repository.

## Mandatory steps

1. **Unset proxy variables** – before running any `npm` commands, **and whenever you start a new shell session**, execute `unset npm_config_http_proxy npm_config_https_proxy` to silence `http-proxy` warnings.
   Run `npm ping` to verify that the registry is reachable before proceeding.
   Run `mise trust` once to trust `.mise.toml`, then run `mise settings add idiomatic_version_file_enable_tools node --yes` to silence warnings about idiomatic version files.
2. **Check network access** – ensure the environment can reach both
   `https://registry.npmjs.org` and `https://cdn.playwright.dev`. The setup
   script downloads packages and browsers from these domains. If they are
   blocked, adjust your environment or proxy settings.

3. **Install dependencies** – run `npm run setup` at the repository root **before your first `npm run ci`**. Run it again whenever the container is restarted or if Playwright tests fail with messages like "Test was interrupted" or "page.evaluate: Test ended". This script unsets proxy variables, checks registry connectivity, runs `npm ci` in the root and `backend/`, and installs Playwright browsers.
   - If `npm ci` fails with an `EUSAGE` error complaining that packages are missing from the lock file, run `npm install` in the affected directory and then re-run the setup script.
   - Set `SKIP_PW_DEPS=1` before running the setup script if Playwright dependencies are already installed. This skips the long `apt-get` step and reduces CI time. The `smoke` script also runs the setup script, so use `SKIP_PW_DEPS=1 npm run smoke` to avoid reinstalling Playwright dependencies when they are already present.
4. **Format code** – run `npm run format` in `backend/` to apply Prettier formatting.
5. **Run tests** – execute `npm test` in `backend/`. If tests cannot run because of environment limitations, mention this in the PR.
6. **Run full CI locally** – execute `npm run ci` at the repo root before opening a PR. Set `SKIP_PW_DEPS=1` if Playwright dependencies were installed previously to avoid redundant `apt-get` steps.
7. **Install Playwright browsers** – the setup script installs these automatically. If browsers or host dependencies are missing (e.g. Playwright warns that the host system lacks libraries), run `CI=1 npx playwright install --with-deps` manually.
8. **Run smoke tests** – execute `npm run smoke` at the repository root. This script starts the dev server and runs the Playwright smoke test. If the browsers are already installed, prepend `SKIP_PW_DEPS=1` to skip reinstalling them. **Do not run `npx playwright test` directly** – that can trigger `"Playwright Test did not expect test() to be called here"` errors when dependencies are missing.
9. **Limit scope** – only modify files related to the task. Do not change anything under `img/`, `models/`, or `uploads/` unless explicitly requested. Avoid editing `docs/` unless the task specifically involves documentation.
10. **Use Conventional Commits** – commit messages must follow the `type: description` format enforced by commitlint. Allowed types are `build`, `ci`, `docs`, `feat`, `fix`, `chore`, `refactor`, `test`, `style`, `perf`, and `revert`. Example: `fix: handle missing avatar images`.
11. **Review your diff** – run `git status --short` and `git diff --stat` to ensure only intended files were modified. Revert any unrelated changes.
12. **Include logs** – paste the output of `npm test` (or `npm run test-ci`) and `npm run format` in the PR description so maintainers can verify the steps.
13. **Avoid PRs with failing tests** – if `npm run ci` or the smoke tests fail for reasons other than environment limitations, do not open a pull request. Fix the issues or open an issue summarizing the failure instead.
14. **Avoid committing binary files** – Codex cannot generate patches for binary changes. Do not modify images, audio, or other binary assets. If adding new ones, update `.gitattributes` so they are treated as binary.
15. **Pin GitHub Action versions** – use explicit tags instead of broad majors to prevent resolution errors (e.g. `aquasecurity/tfsec-action@v1.0.3`).

## Troubleshooting

If `npm run ci` outputs messages like `1 interrupted` or `2 did not run` during the Playwright tests, the browsers were likely not installed. You may also see errors such as `browser.newContext: Test ended`, `page.evaluate: Test ended`, or `Test was interrupted` in `/tmp/ci.log`:

```
Test was interrupted.

Error: page.goto: Test ended.
  - navigating to "http://localhost:3000/login.html", waiting until "load"
    at e2e/a11y.test.js:14:16
```

Run `npm run setup` and retry the CI and smoke steps when this happens.

These messages may show up in `/tmp/ci.log` as:

```
1 interrupted
2 did not run
```

Running the setup script again installs the missing browsers and resolves the failure.

## PR notes

Include a short summary of your changes and how you validated them (formatting and test output).
