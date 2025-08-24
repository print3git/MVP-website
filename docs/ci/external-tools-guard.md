# External Tool Dependency Guard

This guard scans GitHub Actions workflows and composite actions for usages of tools
that may not be available in all environments. If a tool is used without being
installed in the same job, the guard reports an error or warning.

## Rules

- Tools such as `rg`, `yq`, `jq`, `xmlstarlet`, `lsb_release`, and `envsubst`
  must be installed or replaced with a Node/bash fallback before they are used.
- Platform specific tools like `gsed`, `gawk`, and `netstat` trigger warnings
  when used without an install step.
- The check also warns when relying on default tools like `jq` on `ubuntu-latest`
  without installing them explicitly.

## Baseline tools

`jq` is available on `ubuntu-latest` runners. Using it without installation
produces a warning rather than an error.

## Satisfying the guard

Add an explicit install step in the job before the tool is used:

```yaml
- run: sudo apt-get update && sudo apt-get install -y ripgrep
- run: rg "pattern"
```

or replace the tool with a script that does not require extra binaries.
