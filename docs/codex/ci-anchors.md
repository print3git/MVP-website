# CI anchors

This guide shows how to use YAML anchors in GitHub Actions to reuse common steps. The accompanying [`ci-anchors.yml`](ci-anchors.yml) workflow demonstrates anchors for checkout, Node.js setup, and caching.

Define reusable steps:

```yaml
x-checkout: &checkout
  uses: actions/checkout@v4
  with:
    fetch-depth: 0

x-setup-node: &setup-node
  uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: npm

x-cache-node-modules: &cache-node-modules
  uses: actions/cache@v4
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-
```

Reference them in jobs:

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - *checkout
      - *setup-node
      - *cache-node-modules
      - run: npm test
```

Using anchors centralizes common configuration and keeps workflows concise. Copy these patterns into your own workflows to avoid duplication. This example does not modify any live workflows.
