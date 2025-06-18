Future Codex agents **must** read this file at startup and strictly follow its rules.

# Agent Coordination Protocol

This repository uses a shared file locking mechanism and automated workflows so multiple Codex agents can collaborate safely.

## Task Assignment by Group
- Maintainers may assign agents to groups (e.g. `docs`, `backend`, `frontend`).
- Groups generally correspond to the repository's top-level directories.
- Agents must only modify files within their assigned group unless explicitly instructed otherwise.

## File Locking
- The file `CURRENT_LOCKS.json` in the repository root records which files are modified by open pull requests.
- Before starting work, every agent **must** run `scripts/update_locks.py` to refresh this file.
- Agents must check `CURRENT_LOCKS.json` and avoid editing files listed under another PR.

## Pull Request Submission
- When creating a pull request, include a list of all modified file paths in the PR description.
- Follow the formatting and test instructions in [AGENTS.md](AGENTS.md).
- Use the automated merge queue; do not merge manually.

## Conflict Avoidance
- Rebase your branch frequently so it applies cleanly on top of `main`.
- If `CURRENT_LOCKS.json` shows that another PR modifies the same files, coordinate or wait until that PR merges.

## Improving This Protocol
- Agents may propose improvements to this document by opening a pull request that clearly explains the changes.
- Self-modification of the automation scripts and this protocol is permitted as long as the proposed change is reviewed via pull request.

