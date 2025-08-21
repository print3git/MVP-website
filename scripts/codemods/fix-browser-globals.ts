import fs from "fs";
import path from "path";

const ROOT = path.join(process.cwd(), "frontend");

const COLOR_MAP: Record<string, string> = {
  "#000": "var(--color-black)",
  "#000000": "var(--color-black)",
  "#fff": "var(--color-white)",
  "#ffffff": "var(--color-white)",
  "#f00": "var(--color-red)",
  "#ff0000": "var(--color-red)",
  "#0f0": "var(--color-green)",
  "#00ff00": "var(--color-green)",
  "#00f": "var(--color-blue)",
  "#0000ff": "var(--color-blue)",
};

const GLOBALS = ["window", "document", "localStorage"];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir)) {
    if (entry === "node_modules") continue;
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      walk(full, out);
    } else if (/\.(tsx?|jsx?|css)$/i.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

function guardGlobals(code: string): string {
  for (const name of GLOBALS) {
    const regex = new RegExp(`(?<![.\w$]|typeof\s)${name}\b`, "g");
    code = code.replace(
      regex,
      `(typeof ${name} !== 'undefined' ? ${name} : undefined)`,
    );
  }
  return code;
}

function replaceConsole(code: string): string {
  code = code.replace(/console\.(log|debug)\([^\n]*\);?\n?/g, "");
  code = code.replace(/console\.warn/g, "logger.warn");
  code = code.replace(/console\.error/g, "logger.error");
  code = code.replace(/console\.info/g, "logger.info");
  code = code.replace(/console\.trace/g, "logger.trace");
  return code;
}

function replaceColors(code: string): string {
  for (const [hex, token] of Object.entries(COLOR_MAP)) {
    const regex = new RegExp(hex.replace(/[#]/g, "\\$&"), "gi");
    code = code.replace(regex, token);
  }
  return code;
}

function processFile(file: string) {
  const original = fs.readFileSync(file, "utf8");
  let code = original;
  code = guardGlobals(code);
  code = replaceConsole(code);
  code = replaceColors(code);
  if (code !== original) {
    fs.writeFileSync(file, code);
  }
}

function main() {
  if (!fs.existsSync(ROOT)) return;
  const files = walk(ROOT);
  for (const file of files) {
    processFile(file);
  }
}

main();
