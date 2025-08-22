import os
import time
import logging
from typing import List

import boto3
import requests

GITHUB_API = "https://api.github.com"
OWNER = os.environ["GITHUB_OWNER"]
REPO = os.environ["GITHUB_REPO"]
TOKEN = os.environ["GITHUB_TOKEN"]
STALE_MINUTES = int(os.environ.get("STALE_MINUTES", "30"))

_ec2 = boto3.client("ec2")


def _deregister_runner(runner_id: int, headers: dict) -> None:
    requests.delete(
        f"{GITHUB_API}/repos/{OWNER}/{REPO}/actions/runners/{runner_id}",
        headers=headers,
        timeout=10,
    )


def lambda_handler(event, context):
    """Terminate stale GitHub runners and deregister them."""
    headers = {
        "Authorization": f"Bearer {TOKEN}",
        "Accept": "application/vnd.github+json",
    }

    resp = requests.get(
        f"{GITHUB_API}/repos/{OWNER}/{REPO}/actions/runners",
        headers=headers,
        timeout=10,
    )
    resp.raise_for_status()
    runners: List[dict] = resp.json().get("runners", [])

    now = time.time()
    stale: List[str] = []

    for runner in runners:
        last_seen = runner.get("last_seen_at")
        if not last_seen:
            continue
        last = time.mktime(time.strptime(last_seen, "%Y-%m-%dT%H:%M:%SZ"))
        if runner.get("status") != "online" and now - last > STALE_MINUTES * 60:
            instance_id = runner.get("name")
            logging.info("Terminating stale runner %s", instance_id)
            try:
                _ec2.terminate_instances(InstanceIds=[instance_id])
            except Exception as exc:  # pragma: no cover
                logging.error("Failed to terminate %s: %s", instance_id, exc)
            _deregister_runner(runner["id"], headers)
            stale.append(instance_id)

    return {"terminated": stale}
