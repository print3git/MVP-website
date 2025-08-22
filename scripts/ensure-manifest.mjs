import { existsSync } from "node:fs";
import { resolve } from "node:path";

const manifest = resolve(process.cwd(), "package.json");

if (!existsSync(manifest)) {
  console.error(`No package.json found in ${process.cwd()}`);
  process.exit(2);
}
