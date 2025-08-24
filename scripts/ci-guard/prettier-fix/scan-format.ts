import fs from "fs";
import path from "path";
import prettier from "prettier";

interface Mismatch {
  file: string;
  line: number;
}

async function* walk(dir: string): AsyncGenerator<string> {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      yield* walk(full);
    } else {
      yield full;
    }
  }
}

function firstDiffLine(a: string, b: string): number {
  const len = Math.min(a.length, b.length);
  let line = 1;
  for (let i = 0; i < len; i++) {
    if (a[i] !== b[i]) break;
    if (a[i] === "\n") line++;
  }
  return line;
}

export async function scan(root: string, max = 20): Promise<Mismatch[]> {
  const mismatches: Mismatch[] = [];
  const ignorePath = path.join(root, ".prettierignore");
  for await (const file of walk(root)) {
    const info = await prettier.getFileInfo(file, { ignorePath });
    if (info.ignored || !info.inferredParser) continue;
    const raw = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
    const opts =
      (await prettier.resolveConfig(file, { editorconfig: true })) || {};
    const formatted = await prettier.format(raw, { ...opts, filepath: file });
    if (formatted !== raw) {
      mismatches.push({
        file: path.relative(root, file),
        line: firstDiffLine(raw, formatted),
      });
    }
  }
  if (mismatches.length) {
    console.error(`Found ${mismatches.length} files with formatting issues:`);
    for (const m of mismatches.slice(0, max)) {
      console.error(`${m.file}\t${m.line}`);
    }
    if (mismatches.length > max) {
      console.error(`...and ${mismatches.length - max} more`);
    }
  } else {
    console.log("All files formatted");
  }
  return mismatches;
}

async function main() {
  const args = process.argv.slice(2);
  let dir = process.cwd();
  let max = 20;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--max" && args[i + 1]) {
      max = Number(args[++i]);
    } else {
      dir = path.resolve(arg);
    }
  }
  const mismatches = await scan(dir, max);
  process.exit(mismatches.length ? 1 : 0);
}

if (require.main === module) {
  main();
}
