import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";

export interface AuditResult {
  ok: boolean;
  errors: string[];
  offending: string[];
  counts: Record<string, number>;
}

const POINTER = "version https://git-lfs.github.com/spec/v1";
const PATTERNS = ["img/*.png", "img/*.jpg"];
const EXTENSIONS: Record<string, RegExp> = {
  "img/*.png": /\.png$/i,
  "img/*.jpg": /\.jpg$/i,
};

export function audit(workDir: string = process.cwd()): AuditResult {
  const errors: string[] = [];
  const offending: string[] = [];
  const counts: Record<string, number> = {
    "img/*.png": 0,
    "img/*.jpg": 0,
  };

  const attrsPath = path.join(workDir, ".gitattributes");
  const attrs = fs.existsSync(attrsPath)
    ? fs.readFileSync(attrsPath, "utf8").split(/\r?\n/)
    : [];
  const missing = PATTERNS.filter(
    (p) =>
      !attrs.some((l) => l.startsWith(`${p} `) && l.includes("filter=lfs")),
  );
  if (missing.length) {
    errors.push(`Missing LFS attributes for: ${missing.join(", ")}`);
  }

  const env = { ...process.env, GIT_LFS_SKIP_SMUDGE: "1" };
  let all: string[] = [];
  try {
    const out = execFileSync("git", ["ls-files", "img"], {
      cwd: workDir,
      encoding: "utf8",
    });
    all = out.split(/\r?\n/).filter(Boolean);
  } catch {
    all = [];
  }
  for (const file of all) {
    for (const [patternKey, rx] of Object.entries(EXTENSIONS)) {
      if (!rx.test(file)) continue;
      const content = execFileSync("git", ["show", `HEAD:${file}`], {
        cwd: workDir,
        env,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      });
      if (!content.startsWith(POINTER)) {
        counts[patternKey] += 1;
        offending.push(file);
      }
    }
  }

  if (offending.length) {
    errors.push(
      `Non-pointer files detected:\n${offending.join(
        "\n",
      )}\nRun 'git lfs migrate import --include="img/*.png,img/*.jpg"' and recommit.`,
    );
  }

  const ok = errors.length === 0;
  return { ok, errors, offending, counts };
}

if (require.main === module) {
  const result = audit();
  const outDir = path.join(process.cwd(), "ci-reports");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, "lfs-migrate-enforce.json"),
    JSON.stringify(
      {
        ok: result.ok,
        errors: result.errors,
        offending: result.offending,
        counts: result.counts,
      },
      null,
      2,
    ),
  );
  if (result.ok) {
    console.log("LFS migrate enforce passed");
  } else {
    console.error("LFS migrate enforce failed");
    console.error(result.errors.join("\n"));
    process.exitCode = 1;
  }
}
