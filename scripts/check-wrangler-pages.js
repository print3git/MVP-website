#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "..", "wrangler.toml");

if (!fs.existsSync(file)) {
  console.log("wrangler.toml not found; skipping");
  process.exit(0);
}

const content = fs.readFileSync(file, "utf8");

const forbidden = ["build", "site", "main", "workers_dev"];
const found = forbidden.filter(
  (key) =>
    new RegExp(`^${key}\\s*=`, "m").test(content) ||
    new RegExp(`^\\[${key}\\]`, "m").test(content),
);

if (found.length) {
  console.error(
    `Cloudflare Pages: remove unsupported ${found.join(
      ", ",
    )} keys; Pages reads pages_build_output_dir only.`,
  );
  process.exit(1);
}

if (!/^\s*pages_build_output_dir\s*=\s*.+/m.test(content)) {
  console.error("Cloudflare Pages: pages_build_output_dir is required.");
  process.exit(1);
}

console.log("wrangler.toml OK");
