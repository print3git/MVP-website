const fs = require("fs/promises");
const path = require("path");
const { execSync } = require("child_process");
const { test } = require("node:test");

const repoRoot = path.resolve(__dirname, "../..");
const workflowsDir = path.join(repoRoot, ".github", "workflows");

function appendSummary(message) {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryPath) return Promise.resolve();
  return fs.appendFile(summaryPath, `${message}\n`);
}

test("pipeline configuration avoids common deadlocks", async () => {
  const errors = [];
  const files = await fs.readdir(workflowsDir);

  for (const file of files) {
    if (!file.endsWith(".yml") && !file.endsWith(".yaml")) continue;
    const content = await fs.readFile(path.join(workflowsDir, file), "utf8");

    if (/concurrency:\s*\n\s*group:\s*ci-\$\{\{\s*github.ref\s*\}\}/.test(content)) {
      errors.push(`${file}: uses broad concurrency group ci-\${{ github.ref }}`);
    }

    const lines = content.split(/\r?\n/);
    const jobNames = new Set();
    let inJobs = false;
    for (const line of lines) {
      if (/^jobs:\s*$/.test(line)) inJobs = true;
      else if (inJobs) {
        const m = /^\s{2}([A-Za-z0-9_-]+):\s*$/.exec(line);
        if (m) jobNames.add(m[1]);
      }
    }

    for (let i = 0; i < lines.length; i++) {
      const m = /^\s+needs:\s*(.*)$/.exec(lines[i]);
      if (!m) continue;
      let deps = [];
      if (m[1] && m[1] !== "") {
        deps = m[1].replace(/[\[\]]/g, "").split(/,\s*/);
      } else {
        let j = i + 1;
        while (j < lines.length && /^\s+-\s*(\S+)/.test(lines[j])) {
          deps.push(lines[j].trim().replace(/^-[\s]*/, ""));
          j++;
        }
      }
      for (const dep of deps) {
        if (dep && !jobNames.has(dep)) {
          errors.push(`${file}: job needs missing job '${dep}'`);
        }
      }
    }
  }

  try {
    await fs.access(path.join(repoRoot, "frontend", "dist", "index.html"));
  } catch {
    errors.push("Missing frontend build artifact: frontend/dist/index.html");
  }

  if (errors.length) {
    let commitSha = "unknown";
    let distListing = "";
    try {
      commitSha = execSync("git rev-parse HEAD", { cwd: repoRoot })
        .toString()
        .trim();
    } catch {}
    try {
      distListing = execSync("ls -la frontend/dist", { cwd: repoRoot }).toString();
    } catch (err) {
      distListing = `ls failed: ${err.message}`;
    }
    console.error(`Commit ${commitSha}\n${distListing}`);
    await appendSummary(
      `### CI/CD pipeline issues\n${errors
        .map((e) => `- ${e}`)
        .join("\n")}\nCommit ${commitSha}\n${distListing}`,
    );
    throw new Error(errors.join("; "));
  }

  await appendSummary("### CI/CD pipeline checks\nAll checks passed.");
});
