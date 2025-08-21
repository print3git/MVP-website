# Git LFS

Large binary files should be stored using [Git Large File Storage](https://git-lfs.com/).

## Install

1. Install the Git LFS package for your platform.
   - macOS: `brew install git-lfs`
   - Debian/Ubuntu: `apt-get install git-lfs`
2. Run `git lfs install` once per machine to enable LFS.

## Tracking files

The repository's `.gitattributes` tracks common formats such as `*.png`, `*.jpg`, `*.jpeg`, `*.psd` and `*.zip`.
To track a new binary type:

```bash
git lfs track "*.ext"
```

This command updates `.gitattributes`; commit the change so others pull it.

## Migrating existing files

If a binary was committed without LFS, remove it and commit the change, then re-add after tracking:

```bash
git rm --cached path/to/file
# update .gitattributes or run git lfs track if needed
git add .gitattributes path/to/file
git commit -m "migrate file to LFS"
```

This moves the file to LFS in future commits without rewriting history.
