# Git LFS

Use Git Large File Storage to keep large images out of the repository. After installing git-lfs, convert existing files to pointers with:

```bash
git lfs install
git lfs track "img/*"
git add .gitattributes
git add img/<file>
git commit -m "fix(lfs): convert pointer"
git push
```
