# Self-hosted runners on AWS

Short playbook:

1. Put repo URL and runner registration token into SSM:
   - `/github/runner/url`
   - `/github/runner/registration-token`
2. `cd infra/gh-runner-aws && terraform init && terraform apply`.
3. Check **Settings → Actions → Runners** for `mvp-runner`.
4. (Optional) toggle `off_hours` to save costs.
5. Use `.github/actions/js-stack-setup` in jobs that need `pnpm`/`vite`.
