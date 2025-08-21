# Sparse checkout recipes

Git's sparse checkout can limit the working tree to just the folders you need.
Start with a minimal clone:

```bash
git clone https://github.com/OWNER/REPO.git --filter=blob:none --sparse
cd REPO
git sparse-checkout init --cone
```

## Work on app sources only

```bash
git sparse-checkout set apps
```

## Work on shared packages

```bash
git sparse-checkout set packages
```

## Work on documentation

```bash
git sparse-checkout set docs
```

## Combine multiple areas

```bash
git sparse-checkout set apps packages docs
```

Return to a full checkout when finished:

```bash
git sparse-checkout disable
```
