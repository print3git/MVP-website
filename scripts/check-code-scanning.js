#!/usr/bin/env node
const https = require("https");

const owner = process.env.CI_REPO_OWNER || "print3git";
const repo = process.env.CI_REPO_NAME || "MVP-website";
const token = process.env.GITHUB_TOKEN;

if (!token) {
  console.error("GITHUB_TOKEN not provided");
  process.exit(1);
}

const options = {
  hostname: "api.github.com",
  path: `/repos/${owner}/${repo}/code-scanning/alerts`,
  headers: {
    "User-Agent": "code-scanning-check",
    Authorization: `token ${token}`,
    Accept: "application/vnd.github+json",
  },
};

https
  .get(options, (res) => {
    if (res.statusCode === 404) {
      console.error("Code scanning is not enabled for this repository.");
      res.resume();
      process.exit(1);
    } else {
      res.resume();
      res.on("end", () => process.exit(0));
    }
  })
  .on("error", (err) => {
    console.error(err.message);
    process.exit(1);
  });
