# AGENT GUIDELINES

These guidelines apply to all automated agents (e.g. the Codex agent) working on this repository.

## Mandatory steps

1. **Unset proxy variables** – before running any `npm` commands, execute `unset npm_config_http_proxy npm_config_https_proxy` to silence `http-proxy` warnings.
2. **Install dependencies** – run `npm run setup` at the repository root. This script unsets proxy variables and runs `npm ci` in the root, `backend/`, and `backend/hunyuan_server/` if present.
3. **Format code** – run `npm run format` in `backend/` to apply Prettier formatting.
4. **Run tests** – execute `npm test` in `backend/`. If tests cannot run because of environment limitations, mention this in the PR.
5. **Run full CI locally** – execute `npm run ci` at the repo root before opening a PR.

6. **Install Playwright browsers** – run `npx playwright install` at the repository root to download browsers for running tests.
7. **Run smoke tests** – execute `npx playwright test e2e/smoke.test.js` at the repository root. If the tests fail because Playwright isn't set up correctly, mention this in the PR.
8. **Limit scope** – only modify files related to the task. Do not change anything under `img/`, `models/`, or `uploads/` unless explicitly requested. Avoid editing `docs/` unless the task specifically involves documentation.
9. **Review your diff** – run `git status --short` and `git diff --stat` to ensure only intended files were modified. Revert any unrelated changes.
10. **Include logs** – paste the output of `npm test` (or `npm run test-ci`) and `npm run format` in the PR description so maintainers can verify the steps.

## PR notes

Include a short summary of your changes and how you validated them (formatting and test output).
