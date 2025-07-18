"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });

const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const steps = [
  "setup",
  "lint",
  "smoke",
  "coverage",
  "glb pipeline",
  "env snapshot",
];
// Accept a JSON file mapping step names to Status
const inputPath = process.env.CI_STAGES_FILE || "";
let data = {};
if (inputPath && node_fs_1.default.existsSync(inputPath)) {
  data = JSON.parse(node_fs_1.default.readFileSync(inputPath, "utf8"));
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
const logDir = node_path_1.default.join(process.cwd(), "ci-reports");
node_fs_1.default.mkdirSync(logDir, { recursive: true });
const logFile = node_path_1.default.join(logDir, "ci-summary-b735ac.log");
node_fs_1.default.writeFileSync(
  logFile,
  results.map((r) => `${r.step}: ${r.status}`).join("\n"),
);
if (!allGood) process.exit(1);
