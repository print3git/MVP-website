# AGENT GUIDELINES

These guidelines apply to all automated agents (e.g. the Codex agent) working on this repository.

## Mandatory steps

1. **Install dependencies** – run `npm ci` inside `backend/`. If `backend/hunyuan_server/` contains a `package.json`, run `npm ci` there as well.
2. **Format code** – run `npm run format` in `backend/` to apply Prettier formatting.
3. **Run tests** – execute `npm test` in `backend/`. If tests cannot run because of environment limitations, mention this in the PR.
4. **Limit scope** – only modify files related to the task. Do not change anything under `img/`, `models/`, or `uploads/` unless explicitly requested. Avoid editing `docs/` unless the task specifically involves documentation.
5. **Review your diff** – run `git status --short` and `git diff --stat` to ensure only intended files were modified. Revert any unrelated changes.
6. **Include logs** – paste the output of `npm test` (or `npm run test-ci`) and `npm run format` in the PR description so maintainers can verify the steps.
7. **Automate the process** – run `./scripts/verify-agent.sh` from the repo root to perform the above steps in one go. Include the full output in your PR body.

## PR notes
Include a short summary of your changes and how you validated them (formatting and test output).
