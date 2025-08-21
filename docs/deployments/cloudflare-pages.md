# Cloudflare Pages

The `wrangler.toml` file sets `pages_build_output_dir = "frontend/dist"`. Our CI workflow builds the frontend and uploads the `frontend/dist` artifact for Cloudflare Pages to deploy.
