# Runner cache layout

The CI runner initializes several cache directories to speed up dependency installation:

- `~/.cache/pip` – Python packages
- `~/.cache/go-build` – Go build cache
- `~/.cargo` – Rust crate cache
- `.turbo` – Turbo build artifacts

Use `scripts/runners/warm-cache.sh` to create these directories on a fresh runner and display their disk usage.
