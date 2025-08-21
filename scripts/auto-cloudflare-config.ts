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
    cfg.buildCommand =
      "npm ci --prefix frontend && npm run build --prefix frontend";
  }
}

writeConfig(configFile, cfg);

const tsName = `cloudflare-pages-config-${randomString(15)}.ts`;
fs.writeFileSync(tsName, `export default ${JSON.stringify(cfg, null, 2)};\n`);
console.log(`Updated ${configFile} and generated ${tsName}`);

export function validateEnv(): void {
  const required: Record<string, string | undefined> = {
    CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN,
    CLOUDFLARE_ZONE_ID: process.env.CLOUDFLARE_ZONE_ID,
    CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID,
  };
  for (const [key, value] of Object.entries(required)) {
    if (!value || /^(?:<.*>|your_|example)/i.test(value)) {
      throw new Error(`Missing ${key} – did you forget to set it?`);
    }
  }
}

type DnsRecord = {
  type: string;
  name: string;
  content: string;
};

export async function updateDnsRecord(
  record: DnsRecord,
  { dryRun = false }: { dryRun?: boolean } = {},
): Promise<void> {
  validateEnv();
  const zone = process.env.CLOUDFLARE_ZONE_ID!;
  const token = process.env.CLOUDFLARE_API_TOKEN!;
  const base = `https://api.cloudflare.com/client/v4/zones/${zone}/dns_records`;
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  if (dryRun) {
    console.log(`[dry-run] upsert DNS record ${record.name}`);
    return;
  }
  const res = await fetch(base, {
    method: "POST",
    headers,
    body: JSON.stringify(record),
  });
  if (!res.ok) {
    let message = "request failed";
    try {
      const data = await res.json();
      message =
        data?.errors?.[0]?.message ||
        (res.status === 401
          ? "invalid api token"
          : res.status === 403
            ? "permission denied"
            : res.status === 404
              ? "zone not found"
              : message);
    } catch {
      message = res.statusText || message;
    }
    throw new Error(message);
  }
}
