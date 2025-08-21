// Simple trigger verifier: ensure both push & PR include dev and 00000production
import fs from "fs";
import path from "path";
import yaml from "yaml";

const dir = ".github/workflows";
const files = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"));

const wantBranches = ["dev", "00000production"];
let bad = [];

for (const file of files) {
  const text = fs.readFileSync(path.join(dir, file), "utf8");
  let doc;
  try {
    doc = yaml.parse(text);
  } catch {
    bad.push({ file, push: "(invalid yaml)", pr: "(invalid yaml)" });
    continue;
  }
  const on = doc?.on || {};
  const pushBranches = (on.push?.branches ?? []).map(String);
  const prBranches = (on.pull_request?.branches ?? []).map(String);

  const missingPush = wantBranches.some((b) => !pushBranches.includes(b));
  const missingPR = wantBranches.some((b) => !prBranches.includes(b));

  if (missingPush || missingPR) {
    bad.push({
      file,
      push: pushBranches.length ? pushBranches.join(",") : "(none)",
      pr: prBranches.length ? prBranches.join(",") : "(none)",
    });
  }
}

if (bad.length) {
  console.error("❌ Workflows missing required triggers:");
  for (const row of bad) {
    console.error(` - ${row.file} | push:[${row.push}] pr:[${row.pr}]`);
  }
  process.exit(1);
} else {
  console.log("✅ All workflows include push+PR for dev & 00000production");
}
