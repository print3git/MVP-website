# Test snapshots and Git LFS

- Cloudflare Pages cannot fetch private LFS blobs during clone.
- Therefore, **no files under tests/** may be tracked by Git LFS.
- CI enforces this via `.github/workflows/no-lfs-in-tests.yml`.
- If you see failures, convert the file to a normal blob and update `.gitattributes` if necessary.
