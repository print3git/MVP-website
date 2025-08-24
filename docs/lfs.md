# Git LFS

Run `git lfs install` once locally. Large assets (GLB, snapshots) are tracked via .gitattributes.
If you see “repository state corruption” or failed commits for snapshots, run:
git lfs install
git add -A
git commit -m "Normalize LFS pointers"
CI checks LFS via `.github/workflows/lfs-guard.yml`.
