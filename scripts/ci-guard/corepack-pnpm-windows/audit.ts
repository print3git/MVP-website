import fs from "fs";
import path from "path";

const repoRoot = process.cwd();
const workflowsDir = path.join(repoRoot, ".github", "workflows");
const wfFiles = fs.existsSync(workflowsDir)
  ? fs
      .readdirSync(workflowsDir)
      .filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"))
  : [];

const required = [
  "name: Setup Node (Windows)",
  "name: Enable Corepack (Windows)",
  "name: Prepare pnpm via Corepack (Windows)",
  "name: Fallback: pnpm/action-setup (Windows)",
  "name: Verify pnpm (Windows)",
];

const errors: string[] = [];

for (const wfFile of wfFiles) {
  if (wfFile.startsWith("guard-")) continue;
  const wfPath = path.join(workflowsDir, wfFile);
  const raw = fs.readFileSync(wfPath, "utf8");
  if (!/windows/i.test(raw)) continue;
  const missing = required.some((r) => !raw.includes(r));
  if (missing) {
    errors.push(`${wfFile}: missing Corepack pnpm bootstrap block`);
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
