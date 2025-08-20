import { access } from "fs/promises";
import { resolve } from "path";

const output = resolve("frontend/dist/index.html");

try {
  await access(output);
} catch {
  console.error(`Missing build output: ${output}`);
  process.exit(1);
}
