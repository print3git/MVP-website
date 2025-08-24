# github-script lint suite

This analyzer inspects all GitHub Actions workflows for `actions/github-script` usage and reports common pitfalls.

## Rules

| Rule                     | Severity | Description                                                                                                   |
| ------------------------ | -------- | ------------------------------------------------------------------------------------------------------------- |
| **FORBIDDEN_REQUIRES**   | error    | `require('@actions/core')` or `require('@actions/github')` are not allowed. Use the injected globals instead. |
| **SHADOWED_GLOBALS**     | error    | Avoid top-level `const core`, `const github`, or `const context`.                                             |
| **INVALID_CONTEXT**      | warning  | Use `context` for workflow metadata. Avoid `github.context` or omitting `context` entirely.                   |
| **RAW_OCTOKIT**          | warning  | Do not instantiate `Octokit` or call `github.getOctokit(token)`. Use the injected `github` client.            |
| **MISSING_PERMISSIONS**  | error    | Scripts calling `github.rest.*` require `permissions.actions: read` (or higher) on the workflow or job.       |
| **NO_TRY_CATCH**         | error    | Scripts must wrap logic in `try/catch` and call `core.setFailed` on error.                                    |
| **NO_AWAIT_PAGINATION**  | warning  | Use `github.paginate` when calling `github.rest.actions.listJobsForWorkflowRun` to handle >100 jobs.          |
| **HARDCODED_OWNER_REPO** | warning  | Do not hardcode `owner`/`repo` strings. Use `const { owner, repo } = context.repo`.                           |
| **SIDE_EFFECT_SECRETS**  | warning  | Do not read `process.env.GITHUB_TOKEN` or `GITHUB_PAT` directly. Use the injected client.                     |
| **EMPTY_SCRIPT**         | warning  | Script block is empty or whitespace only.                                                                     |

## Overriding

If a script intentionally violates a rule, add a `// github-script-lint-disable <RULE>` comment on the relevant line. Use sparingly and document the reasoning in the commit message.
