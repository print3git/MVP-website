import json
import math
import os
from typing import Dict

import boto3
import requests


GITHUB_API = "https://api.github.com"


def fetch_queue(owner: str, repo: str, token: str) -> Dict[str, int]:
    """Return queued job counts grouped by label."""
    url = f"{GITHUB_API}/repos/{owner}/{repo}/actions/runners/queue"
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
    }
    resp = requests.get(url, headers=headers, timeout=10)
    resp.raise_for_status()
    data = resp.json()
    counts: Dict[str, int] = {}
    for job in data.get("workflow_job_runs", []):
        for label in job.get("labels", []):
            counts[label] = counts.get(label, 0) + 1
    return counts


def scale_asg(asg_name: str, desired: int) -> None:
    client = boto3.client("autoscaling")
    client.update_auto_scaling_group(
        AutoScalingGroupName=asg_name, DesiredCapacity=desired
    )


def handler(event, context):  # pragma: no cover - Lambda entrypoint
    owner = os.environ["GITHUB_OWNER"]
    repo = os.environ["GITHUB_REPO"]
    token = os.environ["GITHUB_TOKEN"]
    asg = os.environ["ASG_NAME"]
    max_runners = int(os.environ.get("MAX_RUNNERS", "1"))
    burst = float(os.environ.get("BURST_MULTIPLIER", "1"))
    quotas = json.loads(os.environ.get("LABEL_QUOTAS", "{}"))

    counts = fetch_queue(owner, repo, token)
    queued_total = sum(counts.values())

    desired = 0
    for label, count in counts.items():
        limit = quotas.get(label, max_runners)
        desired += min(math.ceil(count * burst), limit)

    desired = min(desired, max_runners)
    if queued_total == 0:
        desired = 0

    scale_asg(asg, int(desired))
