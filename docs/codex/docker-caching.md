# Docker caching

To improve local Docker build times, enable BuildKit and persist its cache.

## Enable BuildKit

Make sure the Docker daemon runs with BuildKit enabled. For Docker Desktop
this can be toggled in **Settings → Build → Use BuildKit**. On other
systems set the daemon config with:

```json
{
  "features": { "buildkit": true }
}
```

## Use BuildKit at build time

Export `DOCKER_BUILDKIT=1` before running `docker build` so the CLI uses
BuildKit:

```sh
DOCKER_BUILDKIT=1 docker build .
```

## Persist the cache

BuildKit stores cache data under `~/.cache/buildx`. Reuse this cache across
builds by supplying it as both a source and destination:

```sh
docker buildx build \
  --cache-from=type=local,src=~/.cache/buildx \
  --cache-to=type=local,dest=~/.cache/buildx \
  .
```

This keeps previous layers in `~/.cache/buildx` so subsequent builds are
significantly faster.
