const fs = require("fs");
const path = require("path");
const core = require("@actions/core");

function loadJSON(file) {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), file), "utf8"));
}

const pkg = loadJSON("package.json");
const lock = loadJSON("package-lock.json");
const rootPkg = lock.packages && lock.packages[""] ? lock.packages[""] : {};
const lockDeps = rootPkg.dependencies || {};
const lockDevDeps = rootPkg.devDependencies || {};

function diffSection(section, lockSection) {
  const deps = pkg[section] || {};
  const diffs = [];
  for (const [name, spec] of Object.entries(deps)) {
    const lockSpec = lockSection[name];
    if (lockSpec !== spec) {
      diffs.push({
        section,
        name,
        expected: spec,
        actual: lockSpec || "(missing)",
      });
    }
  }
  return diffs;
}

const diffs = [
  ...diffSection("dependencies", lockDeps),
  ...diffSection("devDependencies", lockDevDeps),
];

if (diffs.length === 0) {
  process.exit(0);
}

const diffLines = diffs
  .map(
    (d) =>
      `- ${d.section} ${d.name}: ${d.actual}\n+ ${d.section} ${d.name}: ${d.expected}`,
  )
  .join("\n");
const summary = [
  "## Lockfile drift detected",
  "",
  "```diff",
  diffLines,
  "```",
  "",
  "To fix:",
  "",
  "```sh",
  "npm install && npm -C frontend install",
  "```",
  "",
].join("\n");

if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
} else {
  console.log(summary);
}

let ciInstall = false;
try {
  const workflowDir = path.join(".github", "workflows");
  if (fs.existsSync(workflowDir)) {
    for (const file of fs.readdirSync(workflowDir)) {
      const content = fs.readFileSync(path.join(workflowDir, file), "utf8");
      if (content.includes("npm ci")) {
        ciInstall = true;
        break;
      }
    }
  }
} catch (err) {
  // ignore
}

const message =
  "Lockfile drift detected. Run: npm install && npm -C frontend install";
if (ciInstall) {
  core.warning(message);
} else {
  core.notice(message);
}
