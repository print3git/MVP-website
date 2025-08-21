# Continuous integration

This repository builds the frontend within CI and deploys the pre-built assets to Cloudflare Pages.
Before any Cloudflare command runs the workflow verifies that `frontend/dist/index.html` exists
so failures surface clearly instead of as obscure Wrangler configuration errors. Cloudflare Pages'
own build step is intentionally disabled; the Pages project must not have a `build_command` or
`root_dir` configured. The deploy workflow asserts this by inspecting the project with `wrangler
pages project info` and will fail if a Pages-side build is detected.

During deployment the workflow caches `~/.npm` for the `frontend` package via `actions/setup-node`
and publishes the site using `wrangler pages deploy`. A separate diagnostic workflow performs a
non-blocking dist check with `continue-on-error: true` so a failing Pages build will not prevent
other jobs from completing. The resulting preview URL is uploaded as an artifact and commented on
the commit for easy reference.
