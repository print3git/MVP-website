# Artifacts

This repository includes a composite action that prevents empty artifact uploads. The action checks whether the provided path exists and contains data before uploading. If the path is missing or empty, the step is a no-op.

## Usage

```yaml
- uses: ./.github/actions/artifact-dedupe
  with:
    name: coverage
    path: coverage
```

When the `coverage` directory is absent or empty, no artifact is uploaded.
