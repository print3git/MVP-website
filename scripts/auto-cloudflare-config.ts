#!/usr/bin/env ts-node
// @ts-nocheck
import fs from "fs";
import yaml from "yaml";
import crypto from "crypto";

const configFile = process.argv[2] || "cloudflare-pages.config.json";
const pkg: {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
} = JSON.parse(fs.readFileSync("package.json", "utf8"));

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
if (!cfg.buildCommand) {
  const fw = detectFramework();
  if (fw) {
    cfg.buildCommand = "npm run build";
  }
}

writeConfig(configFile, cfg);

const tsName = `cloudflare-pages-config-${randomString(15)}.ts`;
fs.writeFileSync(tsName, `export default ${JSON.stringify(cfg, null, 2)};\n`);
console.log(`Updated ${configFile} and generated ${tsName}`);
