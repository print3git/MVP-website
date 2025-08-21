const fs = require("fs");
const path = require("path");
const yaml = require("yaml");
const core = require("@actions/core");

function loadJSON(file) {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), file), "utf8"));
}
function loadYAML(file) {
  return yaml.parse(fs.readFileSync(path.join(process.cwd(), file), "utf8"));
}

const pkg = loadJSON("package.json");
const lock = loadYAML("pnpm-lock.yaml");
const importer =
  lock.importers && lock.importers["."] ? lock.importers["."] : {};
const lockDeps = importer.dependencies || {};
const lockDevDeps = importer.devDependencies || {};

function diffSection(section, lockSection) {
  const deps = pkg[section] || {};
  const diffs = [];
  for (const [name, spec] of Object.entries(deps)) {
    const lockEntry = lockSection[name];
    const lockSpec = lockEntry && lockEntry.specifier;
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
  "pnpm install && pnpm -C frontend install",
  "```",
  "",
].join("\n");

if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
} else {
  console.log(summary);
}

let frozenLockfile = false;
try {
  const workflowDir = path.join(".github", "workflows");
  if (fs.existsSync(workflowDir)) {
    for (const file of fs.readdirSync(workflowDir)) {
      const content = fs.readFileSync(path.join(workflowDir, file), "utf8");
      if (content.includes("--frozen-lockfile")) {
        frozenLockfile = true;
        break;
      }
    }
  }
} catch (err) {
  // ignore
}

const message =
  "Lockfile drift detected. Run: pnpm install && pnpm -C frontend install";
if (frozenLockfile) {
  core.warning(message);
} else {
  core.notice(message);
}
