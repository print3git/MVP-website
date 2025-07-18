#!/usr/bin/env ts-node
/* eslint-disable */
import fs from "fs";
import yaml from "yaml";
import crypto from "crypto";

const configFile = process.argv[2] || "cloudflare-pages.config.json";
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));

export function detectFramework(): string | null {
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
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

export function randomString(len: number): string {
  return crypto
    .randomBytes(len)
    .toString("base64")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, len);
}

export function readConfig(file: string): any {
  if (!fs.existsSync(file)) return {};
  const txt = fs.readFileSync(file, "utf8");
  if (file.endsWith(".json")) return JSON.parse(txt);
  return yaml.parse(txt);
}

export function writeConfig(file: string, data: any): void {
  if (file.endsWith(".json"))
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  else fs.writeFileSync(file, yaml.stringify(data));
}

export function main(file: string = configFile): void {
  const cfg = readConfig(file);
  if (!cfg.buildCommand) {
    const fw = detectFramework();
    if (fw) {
      cfg.buildCommand = "npm run build";
    }
  }

  writeConfig(file, cfg);

  const tsName = `cloudflare-pages-config-${randomString(15)}.ts`;
  fs.writeFileSync(tsName, `export default ${JSON.stringify(cfg, null, 2)};\n`);
  console.log(`Updated ${file} and generated ${tsName}`);
}

if (require.main === module) {
  main(configFile);
}
