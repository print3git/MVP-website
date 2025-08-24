# Repository Size Audit

To inspect Git repository size locally, run:

```sh
git count-objects -vH
```

For a deeper analysis install [git-sizer](https://github.com/github/git-sizer) and run:

```sh
git-sizer -v
```

If the report shows unusually large objects or many unreachable objects, prune your local repository:

```sh
git reflog expire --expire=now --all

git gc --prune=now --aggressive
```

This removes discarded objects and repacks the repository to reduce disk usage.
