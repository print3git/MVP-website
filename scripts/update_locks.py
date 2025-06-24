#!/usr/bin/env python3
"""Update CURRENT_LOCKS.json with files modified in open PRs."""

import json
import os
import sys
try:
    import requests
except ModuleNotFoundError:
    requests = None
import urllib.request


def main():
    token = os.getenv("GITHUB_TOKEN")
    repo = os.getenv("GITHUB_REPOSITORY")
    if not token or not repo:
        sys.stderr.write("GITHUB_TOKEN and GITHUB_REPOSITORY must be set\n")
        sys.exit(1)

    headers = {"Authorization": f"token {token}", "Accept": "application/vnd.github+json"}
    if requests:
        session = requests.Session()
        session.headers.update(headers)

        def fetch_json(url: str):
            resp = session.get(url)
            next_url = resp.links.get("next", {}).get("url")
            return resp.status_code, resp.json(), next_url

    else:

        def fetch_json(url: str):
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req) as resp:
                status = resp.status
                data = json.loads(resp.read().decode())
                link_header = resp.headers.get("Link", "")
            next_url = None
            if link_header:
                for part in link_header.split(','):
                    if 'rel="next"' in part:
                        next_url = part[part.find('<') + 1 : part.find('>')]
                        break
            return status, data, next_url

    prs_url = f"https://api.github.com/repos/{repo}/pulls?state=open&per_page=100"

    locks = {}
    while prs_url:
        status, prs, next_url = fetch_json(prs_url)
        if status != 200:
            sys.stderr.write(f"Failed to fetch PRs: {status}\n")
            sys.exit(1)

        for pr in prs:
            number = pr["number"]
            files_url = pr["url"] + "/files"
            fs_status, files_json, _ = fetch_json(files_url)
            if fs_status != 200:
                sys.stderr.write(
                    f"Failed to fetch files for PR {number}: {fs_status}\n"
                )
                sys.exit(1)
            files = [f["filename"] for f in files_json]
            locks[str(number)] = files

        prs_url = next_url

    with open("CURRENT_LOCKS.json", "w") as f:
        json.dump(locks, f, indent=2, sort_keys=True)


if __name__ == "__main__":
    main()
