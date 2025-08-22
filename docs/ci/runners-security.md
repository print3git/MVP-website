# Runner security

## Limit job hooks

Configure the runner hooks so that no secrets are exposed. Set the following environment variables for each runner:

```sh
export ACTIONS_RUNNER_HOOK_JOB_STARTED="printf '%s %s' \"$GITHUB_RUN_ID\" \"$GITHUB_JOB\""
export ACTIONS_RUNNER_HOOK_JOB_COMPLETED="printf '%s %s $GITHUB_JOB_STATUS' \"$GITHUB_RUN_ID\" \"$GITHUB_JOB\""
```

These hooks emit only metadata and avoid leaking repository secrets.

## Container isolation

Do not mount the host Docker socket into job containers for untrusted pull requests. Building or testing unreviewed code with access to the host daemon can allow privilege escalation.
