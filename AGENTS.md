# AGENT GUIDELINES

These guidelines apply to all automated agents (e.g. the Codex agent) working on this repository.

## Mandatory steps

1. **Unset proxy variables** – before running any `npm` commands, **and whenever you start a new shell session**, execute `unset npm_config_http_proxy npm_config_https_proxy` to silence `http-proxy` warnings.
   Run `npm ping` to verify that the registry is reachable before proceeding.
2. **Install dependencies** – run `npm run setup` at the repository root. This script unsets proxy variables, checks registry connectivity, runs `npm ci` in the root, `backend/`, and `backend/hunyuan_server/` if present, and installs Playwright browsers.
   - Set `SKIP_PW_DEPS=1` before running the setup script if Playwright dependencies are already installed. This skips the long `apt-get` step and reduces CI time. The `smoke` script automatically exports this variable.
3. **Format code** – run `npm run format` in `backend/` to apply Prettier formatting.
4. **Run tests** – execute `npm test` in `backend/`. If tests cannot run because of environment limitations, mention this in the PR.
5. **Run full CI locally** – execute `npm run ci` at the repo root before opening a PR.
6. **Install Playwright browsers** – the setup script installs these automatically. If browsers are missing, run `CI=1 npx playwright install --with-deps` manually.
7. **Run smoke tests** – execute `npm run smoke` at the repository root. This script sets `SKIP_PW_DEPS=1` to bypass Playwright's dependency installation when the browsers are already installed. **Do not run `npx playwright test` directly** – that can trigger `"Playwright Test did not expect test() to be called here"` errors when dependencies are missing.
8. **Limit scope** – only modify files related to the task. Do not change anything under `img/`, `models/`, or `uploads/` unless explicitly requested. Avoid editing `docs/` unless the task specifically involves documentation.
9. **Use Conventional Commits** – commit messages must follow the `type: description` format enforced by commitlint. Allowed types are `build`, `ci`, `docs`, `feat`, `fix`, `chore`, `refactor`, `test`, `style`, `perf`, and `revert`. Example: `fix: handle missing avatar images`.
10. **Review your diff** – run `git status --short` and `git diff --stat` to ensure only intended files were modified. Revert any unrelated changes.
11. **Include logs** – paste the output of `npm test` (or `npm run test-ci`) and `npm run format` in the PR description so maintainers can verify the steps.
12. **Avoid PRs with failing tests** – if `npm run ci` or the smoke tests fail for reasons other than environment limitations, do not open a pull request. Fix the issues or open an issue summarizing the failure instead.
13. **Avoid committing binary files** – Codex cannot generate patches for binary changes. Do not modify images, audio, or other binary assets. If adding new ones, update `.gitattributes` so they are treated as binary.

## Troubleshooting

If `npm run ci` outputs messages like `1 interrupted` or `2 did not run` during the Playwright tests, the browsers were likely not installed. Run `npm run setup` and retry the CI and smoke steps.

## PR notes

Include a short summary of your changes and how you validated them (formatting and test output).
