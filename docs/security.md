### Snyk Scans

This workflow uses Snyk to test for high-severity vulnerabilities.

- **To enable**: add your Snyk API token as the `SNYK_TOKEN` secret in GitHub repo settings.
- **Fallback**: if `SNYK_TOKEN` is missing, CI will automatically run `npm audit --audit-level=high`.
- **Validation**: invalid tokens will error early with a clear message.
