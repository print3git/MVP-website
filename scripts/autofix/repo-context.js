import fs from "fs/promises";
import path from "path";

async function fileExists(p) {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

export async function summarizeRepo() {
  const summary = {};
  if (await fileExists("pnpm-lock.yaml")) summary.packageManager = "pnpm";
  else if (await fileExists("package-lock.json"))
    summary.packageManager = "npm";
  else summary.packageManager = "unknown";

  try {
    const pkg = JSON.parse(await fs.readFile("package.json", "utf8"));
    summary.scripts = pkg.scripts || {};
    summary.workspaces = pkg.workspaces || [];
    summary.monorepo =
      Array.isArray(pkg.workspaces) && pkg.workspaces.length > 0;
  } catch {
    summary.scripts = {};
  }

  summary.workflows = await fs.readdir(".github/workflows").catch(() => []);

  const languages = {};
  async function walk(dir) {
    const entries = await fs
      .readdir(dir, { withFileTypes: true })
      .catch(() => []);
    for (const e of entries) {
      const res = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (dir.split(path.sep).length > 5) continue;
        await walk(res);
      } else {
        const ext = path.extname(e.name).slice(1);
        if (!ext) continue;
        languages[ext] = (languages[ext] || 0) + 1;
      }
    }
  }
  await walk(".");
  summary.languages = languages;
  summary.constraints = {
    npm_or_pnpm: summary.packageManager,
    workflows_style: "github-actions",
    languages,
  };
  return summary;
}

export async function loadSnippetsForHints(hints = []) {
  const results = [];
  for (const hint of hints) {
    if (results.length >= 5) break;
    const p = path.resolve(hint);
    if (await fileExists(p)) {
      const data = await fs.readFile(p, "utf8").catch(() => "");
      results.push({
        path: hint,
        snippet: data.split("\n").slice(0, 200).join("\n"),
      });
    }
  }
  return results;
}
