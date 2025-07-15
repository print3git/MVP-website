#!/usr/bin/env node
const https = require("https");
const http = require("http");
const { URL } = require("url");

const token = process.env.GITHUB_TOKEN;
if (!token) {
  console.warn("GITHUB_TOKEN not set; skipping code scanning check");
  process.exit(0);
}
const owner =
  process.env.CI_REPO_OWNER ||
  (process.env.GITHUB_REPOSITORY || "").split("/")[0] ||
  "print3git";
const repo =
  process.env.CI_REPO_NAME ||
  (process.env.GITHUB_REPOSITORY || "").split("/")[1] ||
  "MVP-website";
const base = process.env.GITHUB_API_URL || "https://api.github.com";
const url = new URL(`/repos/${owner}/${repo}`, base);

const options = {
  headers: {
    "User-Agent": "codeql-check",
    Authorization: `token ${token}`,
    Accept: "application/vnd.github+json",
  },
};
const client = url.protocol === "http:" ? http : https;
client
  .get(url, options, (res) => {
    let data = "";
    res.on("data", (c) => (data += c));
    res.on("end", () => {
      try {
        const json = JSON.parse(data);
        const status =
          json.security_and_analysis &&
          json.security_and_analysis.advanced_security &&
          json.security_and_analysis.advanced_security.status;
        if (status !== "enabled") {
          console.error("Code scanning is not enabled for this repository.");
          process.exit(1);
        } else {
          console.log("✅ Code scanning enabled");
        }
      } catch (err) {
        console.error(err.message);
        process.exit(1);
      }
    });
  })
  .on("error", (err) => {
    console.error(err.message);
    process.exit(1);
  });
