# Branching Policy

- Work only on short-lived feature branches (e.g., `feat/xyz`).
- Never commit directly to `dev` or `production`.
- Daily refresh of `dev` locally:
  ```
  git fetch origin
  git switch dev
  git reset --hard origin/dev
  git switch -c feat/<ticket-or-name>
  ```
- Open PRs into `dev`; `dev` → `production` via PR when green.
- Lockfile rules: never hand-edit `package-lock.json`; run `npm install` and commit changes when `package.json` changes.
