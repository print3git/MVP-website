import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const mapPath = resolve(__dirname, "../../ci/cloudflare/vars-alias.map.json");
const aliasMap: Record<string, string[]> = JSON.parse(
  readFileSync(mapPath, "utf8"),
);

for (const names of Object.values(aliasMap)) {
  const value = names.map((n) => process.env[n]).find(Boolean);
  if (value) {
    for (const name of names) {
      process.env[name] = value;
    }
  }
}

export {};
