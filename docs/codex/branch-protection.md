# Branch protection settings

To keep the repository stable and predictable, configure branch protection with these recommendations:

## Required status checks
- Enable "Require status checks to pass before merging".
- Include continuous integration, formatting, and test checks in the required list.

## Linear history
- Enable "Require linear history" so merges do not introduce merge commits.
- This ensures a clean, straight commit history and simplifies reverts.

## Review requirements
- Enable "Require a pull request before merging".
- Require at least one approving review from someone other than the author.
- Dismiss stale approvals when new commits are pushed.

Following these settings encourages high quality contributions and keeps main branches reliable.
