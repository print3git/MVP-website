/* eslint-disable */
import fs from "node:fs";
import path from "node:path";

const steps = [
  "setup",
  "lint",
  "smoke",
  "coverage",
  "glb pipeline",
  "env snapshot",
];

interface Status {
  exitCode: number;
}

// Accept a JSON file mapping step names to Status
const inputPath = process.env.CI_STAGES_FILE || "";
let data: Record<string, Status> = {};
if (inputPath && fs.existsSync(inputPath)) {
  data = JSON.parse(fs.readFileSync(inputPath, "utf8"));
}

const results = steps.map((step) => {
  const st = data[step] ?? {
    exitCode: Number(
      process.env[`${step.toUpperCase().replace(/ /g, "_")}_STATUS`] || 0,
    ),
  };
  return { step, status: st.exitCode === 0 ? "ok" : `failed (${st.exitCode})` };
});

let allGood = true;
for (const r of results) {
  if (r.status !== "ok") allGood = false;
}

console.table(results);

const logDir = path.join(process.cwd(), "ci-reports");
fs.mkdirSync(logDir, { recursive: true });
const logFile = path.join(logDir, "ci-summary-b735ac.log");
fs.writeFileSync(
  logFile,
  results.map((r) => `${r.step}: ${r.status}`).join("\n"),
);

if (!allGood) process.exit(1);
