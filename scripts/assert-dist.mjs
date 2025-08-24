import { access } from "fs/promises";
import { resolve } from "path";
import { execSync } from "child_process";

const output = resolve("frontend/dist/index.html");

try {
  await access(output);
} catch {
  console.error(`Missing build output: ${output}`);
  try {
    const rev = execSync("git rev-parse --short HEAD").toString().trim();
    console.error(rev);
  } catch {}
  try {
    const ls = execSync("ls -la frontend/dist").toString().trim();
    console.error(ls);
  } catch {}
  process.exit(1);
}
