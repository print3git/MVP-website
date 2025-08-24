# CI Runbook

## Lockfile mismatch

If `npm ci` complains about missing packages, run:

```sh
npm install
```

then commit the updated lockfile.

## Vite missing

When builds fail with `vite: command not found`, install frontend deps:

```sh
npm ci --prefix frontend
```

## LFS pointers in repository

If files show Git LFS pointers instead of content, fetch them with:

```sh
git lfs pull
```
