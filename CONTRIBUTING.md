# Contributing

Thank you for helping improve this project! Please follow these guidelines when making changes.

## Package management

- This repository uses **pnpm** exclusively. Never run `npm` or `yarn`.
- Do not add `package-lock.json` or `yarn.lock` files.
- Update `package.json` and `pnpm-lock.yaml` together when modifying dependencies.
- After any dependency change run:
  ```bash
  pnpm install
  pnpm install --frozen-lockfile
  ```
  Commit both files if they changed.
- Consider the impact on all workspaces under `backend/` when adding dependencies.

## Development workflow

1. Install dependencies with `pnpm install` at the repo root and inside `backend/` and `backend/hunyuan_server/` if present.
2. Format code with `pnpm run format` in `backend/`.
3. Run tests with `pnpm test` in `backend/`. If tests fail to run due to environment limits, mention this in your PR.
4. Execute `pnpm run ci` at the repo root before opening a pull request.

Codex and other automated agents must also follow [AGENTS.md](AGENTS.md).
