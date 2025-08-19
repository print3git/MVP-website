#!/usr/bin/env ts-node
// @ts-nocheck
import fs from "fs";
import yaml from "yaml";
import crypto from "crypto";

const args = process.argv.slice(2);
const dryRunIndex = args.indexOf("--dry-run");
const dryRun = dryRunIndex !== -1;
if (dryRun) args.splice(dryRunIndex, 1);
const configFile = args[0] || "cloudflare-pages.config.json";
const pkg: {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
} = JSON.parse(fs.readFileSync("package.json", "utf8"));

function ensureRequired(values: Record<string, string | undefined>): void {
  for (const [key, val] of Object.entries(values)) {
    if (!val || /YOUR_|REPLACE_ME|^\s*$/.test(val)) {
      throw new Error(
        `Missing required ${key}. Set the ${key} environment variable or add a valid value to ${configFile}.`,
      );
    }
  }
}

function detectFramework(): string | null {
  const deps: Record<string, string> = {
    ...pkg.dependencies,
    ...pkg.devDependencies,
  } as Record<string, string>;
  if (
    fs.existsSync("next.config.js") ||
    fs.existsSync("next.config.ts") ||
    deps["next"]
  ) {
    return "next";
  }
  if (
    fs.existsSync("vite.config.js") ||
    fs.existsSync("vite.config.ts") ||
    deps["vite"]
  ) {
    return "vite";
  }
  if (deps["react"] || deps["react-dom"] || deps["react-scripts"]) {
    return "react";
  }
  return null;
}

function randomString(len: number): string {
  return crypto
    .randomBytes(len)
    .toString("base64")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, len);
}

function readConfig(file: string): Record<string, unknown> {
  if (!fs.existsSync(file)) return {};
  const txt = fs.readFileSync(file, "utf8");
  if (file.endsWith(".json")) return JSON.parse(txt);
  return yaml.parse(txt);
}

function writeConfig(file: string, data: Record<string, unknown>): void {
  if (file.endsWith(".json"))
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  else fs.writeFileSync(file, yaml.stringify(data));
}

const cfg: Record<string, any> = readConfig(configFile);
ensureRequired({
  CF_API_TOKEN: process.env.CF_API_TOKEN || cfg.apiToken,
  CF_ZONE_ID: process.env.CF_ZONE_ID || cfg.zoneId,
  CF_ACCOUNT_ID: process.env.CF_ACCOUNT_ID || cfg.accountId,
});
if (!cfg.buildCommand) {
  const fw = detectFramework();
  if (fw) {
    cfg.buildCommand = "npm run build";
  }
}
if (!dryRun) {
  writeConfig(configFile, cfg);
  const tsName = `cloudflare-pages-config-${randomString(15)}.ts`;
  fs.writeFileSync(tsName, `export default ${JSON.stringify(cfg, null, 2)};\n`);
  console.log(`Updated ${configFile} and generated ${tsName}`);
} else {
  console.log(`Validated ${configFile} (dry run)`);
}
