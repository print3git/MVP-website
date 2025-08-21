# Repo splitting

## Submodules vs subtree

### Submodules

- Each dependency lives in its own repository referenced by a commit.
- Pros: independent versioning, clear ownership, small clones.
- Cons: extra init/update steps, harder to keep in sync, CI must manage submodule state.

### Subtree

- External projects are copied into the main repo under a directory.
- Pros: self-contained repository, simple clone, history of the subtree preserved.
- Cons: history duplication, merges can be noisy, pushing upstream requires manual splits.

## Minimal recipe: extract `packages/heavy`

Use `git subtree` to split the history for the `packages/heavy` directory and push it to a new repository without rewriting the original repo's history:

```bash
# starting from the MVP-website repository
git fetch origin
# create a branch with only packages/heavy history
git subtree split --prefix=packages/heavy -b heavy-split
# clone and push to the new repo
git clone . ../heavy
cd ../heavy
git checkout heavy-split
# point to the new remote and publish
rm -f .git/modules -r 2>/dev/null
git remote remove origin
git remote add origin git@github.com:your-org/heavy.git
git push -u origin heavy-split:main
```

This results in a standalone repository containing `packages/heavy` and its history, while the original repository remains untouched.
