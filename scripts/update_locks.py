#!/usr/bin/env python3
"""Update CURRENT_LOCKS.json with files modified in open PRs."""

import json
import os
import sys
import requests


def main():
    token = os.getenv("GITHUB_TOKEN")
    repo = os.getenv("GITHUB_REPOSITORY")
    if not token or not repo:
        sys.stderr.write("GITHUB_TOKEN and GITHUB_REPOSITORY must be set\n")
        sys.exit(1)

    session = requests.Session()
    session.headers.update({"Authorization": f"token {token}", "Accept": "application/vnd.github+json"})

    prs_url = f"https://api.github.com/repos/{repo}/pulls?state=open&per_page=100"

    locks = {}
    while prs_url:
        r = session.get(prs_url)
        if r.status_code != 200:
            sys.stderr.write(f"Failed to fetch PRs: {r.status_code}\n{r.text}\n")
            sys.exit(1)

        for pr in r.json():
            number = pr["number"]
            files_url = pr["url"] + "/files"
            rf = session.get(files_url)
            if rf.status_code != 200:
                sys.stderr.write(
                    f"Failed to fetch files for PR {number}: {rf.status_code}\n"
                )
                sys.exit(1)
            files = [f["filename"] for f in rf.json()]
            locks[str(number)] = files

        prs_url = r.links.get("next", {}).get("url")

    with open("CURRENT_LOCKS.json", "w") as f:
        json.dump(locks, f, indent=2, sort_keys=True)


if __name__ == "__main__":
    main()
