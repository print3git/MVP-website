# Cloudflare Pages deployment

Our Cloudflare Pages pipeline builds the frontend once and reuses the output.

## Build artifact

The `.github/workflows/cloudflare-pages-artifact.yml` workflow runs on pushes to `dev` and on pull requests. It uses the Node setup action, runs `npm -w frontend ci` and `npm -w frontend run build`, then uploads `frontend/dist` as the `frontend-dist` artifact.

## Deploy

The deployment workflow, `.github/workflows/cloudflare-pages-deploy.yml`, triggers on pushes to `00000production` or when run manually. It downloads the `frontend-dist` artifact. If the artifact is missing it builds the frontend using the same commands.

Environment variables are normalized through `ci/cloudflare/vars-alias.map.json`, so either `CF_PAGES_*` or `CLOUDFLARE_*` secrets work.

If `frontend/dist` cannot be found after the download/build step the job fails and prints how to fix it: run the artifact workflow and ensure `vite` is installed.

This artifact‑first flow avoids "build output directory not found" errors and prevents uploading Git LFS pointers to Cloudflare.
