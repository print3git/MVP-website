import { readFile, access, appendFile } from "node:fs/promises";
import { execSync } from "node:child_process";
import path from "node:path";

function patternToRegex(pattern) {
  let pat = pattern.trim();
  if (pat.startsWith("/")) pat = pat.slice(1);
  pat = pat.replace(/\./g, "\\.").replace(/\*\*/g, "::DOUBLE::");
  pat = pat.replace(/\*/g, "[^/]*").replace(/::DOUBLE::/g, ".*");
  return new RegExp("^" + pat + "$");
}

async function loadCodeOwners() {
  const content = await readFile(".github/CODEOWNERS", "utf8");
  return content
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((line) => !line.startsWith("#"))
    .map((line) => {
      const [pattern, ...owners] = line.trim().split(/\s+/);
      return { regex: patternToRegex(pattern), owners };
    });
}

function findOwners(owners, file) {
  let match = [];
  for (const entry of owners) {
    if (entry.regex.test(file)) {
      match = entry.owners;
    }
  }
  return match.length ? match : ["@unowned"];
}

async function main() {
  const diffBase = "origin/main...HEAD";
  const changed = execSync(`git diff --name-only --diff-filter=A ${diffBase}`, {
    encoding: "utf8",
  })
    .split("\n")
    .filter(Boolean)
    .filter((f) => f.startsWith("src/"))
    .filter((f) => !/\.test\.[jt]sx?$/.test(f));

  const owners = await loadCodeOwners();
  const missing = [];
  for (const file of changed) {
    const testFile = file.replace(/(\.[jt]sx?)$/, ".test$1");
    try {
      await access(testFile);
    } catch {
      missing.push({ file, owners: findOwners(owners, file) });
    }
  }

  if (missing.length) {
    const lines = missing
      .map((m) => `- ${m.file} (owners: ${m.owners.join(" ")})`)
      .join("\n");
    if (process.env.GITHUB_STEP_SUMMARY) {
      await appendFile(
        process.env.GITHUB_STEP_SUMMARY,
        `## Missing tests\n${lines}\n`,
      );
    }
    console.log(JSON.stringify(missing, null, 2));
    process.exit(1);
  }
  console.log("[]");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
