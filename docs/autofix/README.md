# Autofix orchestrator

This workflow glues the autofix pipeline together. Every run executes the full loop:

1. **harvest** – collect pending issues or code alerts.
2. **cluster** – group related findings for batch fixes.
3. **generate-prompts** – build Codex prompts for each cluster.
4. **codex-driver** – apply generated patches and open pull requests.

Runs can be triggered manually or on a 30 minute schedule. The workflow keeps rerunning until no work remains.

## Required secrets

Set these secrets in the repository to allow the driver to push fixes:

- `AUTOFIX_GH_TOKEN` – personal access token with `repo` scope for committing branches and opening PRs.
- `OPENAI_API_KEY` – API key used by Codex to propose fixes.
- `AUTOFIX_STORAGE` – bucket or database connection string for harvest artifacts.

## Safety rails

- All actions use the least required permissions and run in a fresh checkout.
- The driver exits without committing when no changes are generated.
- Run manually to supervise new fixes or rely on the scheduled cadence for continuous maintenance.
