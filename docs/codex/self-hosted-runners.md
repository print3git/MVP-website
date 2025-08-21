# Self-Hosted Runners

Self-hosted runners let you control hardware and caching for faster, more reliable CI. This guide covers sizing, storage, caching, and labeling best practices.

## Runner sizing

Use machines with ample CPU and memory for the workloads they run. For general CI, a 4-core CPU with 8–16 GB of RAM is a good starting point. Scale up for heavier tasks like build pipelines or end-to-end tests.

## Prefer SSD storage

Runner jobs read and write many files. Backing the working directory with solid-state storage greatly improves performance compared to HDDs.

## Preserve `~/.cache`

Keep the runner's `~/.cache` directory between jobs to retain package downloads, toolchains, and browser binaries. This avoids redundant network traffic and speeds up setup steps.

## Persist Docker layers

When using Docker-in-Docker or building images, ensure the Docker data directory persists so that image layers are cached across jobs.

## Recommended labels

Assign consistent labels so workflows can target the right machines:

- `self-hosted`
- `linux`
- `x64`
- `hot-cache` (indicates the runner keeps its caches warm)

## Example workflow

```yaml
runs-on: [self-hosted, linux, hot-cache]
```
