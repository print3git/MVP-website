const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "../../..");
const workflows = [
  ".github/workflows/smoke_test.yml",
  ".github/workflows/pipeline-smoke.yml",
];

let ok = true;
for (const wf of workflows) {
  const file = path.join(repoRoot, wf);
  const content = fs.readFileSync(file, "utf8");
  const hasBuildBlock =
    /BEGIN MANAGED BLOCK: ci-guard:frontend-smoke-artifact[\s\S]*Upload frontend artifact[\s\S]*END MANAGED BLOCK: ci-guard:frontend-smoke-artifact/.test(
      content,
    );
  const hasDownloadBlock =
    /BEGIN MANAGED BLOCK: ci-guard:frontend-smoke-artifact[\s\S]*Download frontend artifact[\s\S]*END MANAGED BLOCK: ci-guard:frontend-smoke-artifact/.test(
      content,
    );
  if (!hasBuildBlock || !hasDownloadBlock) {
    console.error(`Missing managed block in ${wf}`);
    ok = false;
  }
}
if (!ok) process.exit(1);
