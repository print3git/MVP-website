import { execSync } from "node:child_process";

async function main() {
  const adminToken = process.env.GITHUB_TOKEN_FOR_RUNNER_ADMIN;
  if (!adminToken) {
    console.error("GITHUB_TOKEN_FOR_RUNNER_ADMIN is required");
    process.exit(1);
  }

  let owner: string | undefined = process.argv[2];
  let repo: string | undefined = process.argv[3];

  if (!owner || !repo) {
    const origin = execSync("git config --get remote.origin.url", {
      encoding: "utf8",
    }).trim();
    const match = origin.match(
      /github.com[:/](?<owner>[^/]+)\/(?<repo>[^/]+?)(?:\.git)?$/,
    );
    if (match && match.groups) {
      owner ||= match.groups.owner;
      repo ||= match.groups.repo;
    }
  }

  if (!owner || !repo) {
    console.error("Could not determine repository owner and name");
    process.exit(1);
  }

  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/actions/runners/registration-token`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  );

  if (!res.ok) {
    const text = await res.text();
    console.error(`GitHub API request failed: ${res.status} ${text}`);
    process.exit(1);
  }

  const json = (await res.json()) as { token?: string };
  if (!json.token) {
    console.error("No token in response");
    process.exit(1);
  }
  console.log(json.token);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
