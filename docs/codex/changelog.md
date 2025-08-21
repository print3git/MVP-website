# Changelog Generation

This project uses [github-changelog-generator](https://github.com/github-changelog-generator/github-changelog-generator) to build `CHANGELOG.md` from merged pull requests.

## Generate a changelog

1. Install the gem if it is not already available:

   ```bash
   gem install github_changelog_generator
   ```

2. Ensure a GitHub token with access to the repository is available in the `GITHUB_TOKEN` environment variable.

3. Run the generator from the repository root:

   ```bash
   github_changelog_generator --user <OWNER> --project <REPO> --config-file .github/changelog.yml
   ```

   Replace `<OWNER>` and `<REPO>` with the GitHub organisation and repository name.

The command will update `CHANGELOG.md` based on pull requests and tags. Commit the updated file to publish the new changelog.
