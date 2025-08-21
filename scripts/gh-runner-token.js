#!/usr/bin/env node
const process = require("node:process");

async function main() {
  const adminToken = process.env.GITHUB_TOKEN_FOR_RUNNER_ADMIN;
  const repo = process.env.GITHUB_REPOSITORY;
  if (!adminToken) {
    console.error("GITHUB_TOKEN_FOR_RUNNER_ADMIN is not set");
    process.exit(1);
  }
  if (!repo) {
    console.error("GITHUB_REPOSITORY is not set");
    process.exit(1);
  }
  const url = `https://api.github.com/repos/${repo}/actions/runners/registration-token`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      Accept: "application/vnd.github+json",
    },
  });
  if (!response.ok) {
    console.error(
      `Failed to get runner token: ${response.status} ${response.statusText}`,
    );
    process.exit(1);
  }
  const data = await response.json();
  process.stdout.write(data.token);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
