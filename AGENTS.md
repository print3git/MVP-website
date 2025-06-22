# AGENT GUIDELINES

These guidelines apply to all automated agents (e.g. the Codex agent) working on this repository.

Codex: always read the AGENTS file before performing work.

## Mandatory steps

1. **Unset proxy variables** – before running any pnpm commands, execute `unset npm_config_http_proxy npm_config_https_proxy`.
2. **Install dependencies** – run `pnpm install` in the repo root. Run `pnpm install` in `backend/` and `backend/hunyuan_server/` if those directories contain a `package.json`.
3. **Format code** – run `pnpm run format` in `backend/` to apply Prettier formatting.
4. **Run tests** – execute `pnpm test` in `backend/`. If tests cannot run because of environment limitations, mention this in the PR.
5. **Run full CI locally** – execute `pnpm run ci` at the repo root before opening a PR.
6. **Package management** – This repository uses **pnpm exclusively**. Never use npm or yarn. Never commit `package-lock.json` or `yarn.lock`. All package changes must modify `package.json` and `pnpm-lock.yaml` together. Validate lockfile consistency with `pnpm install` followed by `pnpm install --frozen-lockfile`.
7. **Workspace awareness** – If adding or updating dependencies, consider impacts on all workspaces.
8. **Limit scope** – only modify files related to the task. Do not change anything under `img/`, `models/`, or `uploads/` unless explicitly requested. Avoid editing `docs/` unless the task specifically involves documentation.
9. **Review your diff** – run `git status --short` and `git diff --stat` to ensure only intended files were modified. Revert any unrelated changes.
10. **Include logs** – paste the output of `pnpm test` (or `pnpm run test-ci`) and `pnpm run format` in the PR description so maintainers can verify the steps.

## PR notes

Include a short summary of your changes and how you validated them (formatting and test output).
