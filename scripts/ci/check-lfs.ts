import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";

async function getLfsGlobs(): Promise<string[]> {
  const lines = (await fs.readFile(".gitattributes", "utf8")).split(/\r?\n/);
  return lines
    .map((l) => l.trim())
    .filter(
      (l) =>
        l &&
        !l.startsWith("#") &&
        l.includes("filter=lfs") &&
        !l.includes("-filter=lfs"),
    )
    .map((l) => l.split(/\s+/)[0]);
}

function listFiles(globs: string[]): string[] {
  const files = new Set<string>();
  for (const g of globs) {
    try {
      const out = execFileSync("git", ["ls-files", g], {
        encoding: "utf8",
      });
      out
        .split(/\r?\n/)
        .filter(Boolean)
        .forEach((f) => files.add(f));
    } catch {
      // ignore missing matches
    }
  }
  return [...files];
}

async function findNonPointers(files: string[]): Promise<string[]> {
  const bad: string[] = [];
  for (const f of files) {
    try {
      const txt = await fs.readFile(f, "utf8");
      if (!txt.startsWith("version https://git-lfs.github.com/spec/v1")) {
        bad.push(f);
      }
    } catch {
      // ignore
    }
  }
  return bad;
}

async function main() {
  const globs = await getLfsGlobs();
  const files = listFiles(globs);
  const offenders = await findNonPointers(files);
  if (!offenders.length) {
    console.log("No LFS issues found");
    return;
  }
  console.log("Non-LFS pointer files detected:\n" + offenders.join("\n"));
  const cmds = offenders
    .map((f) => `git lfs migrate import --include=${JSON.stringify(f)}`)
    .join("\n");
  const body = `Non-LFS files detected:\n${offenders
    .map((f) => `- ${f}`)
    .join("\n")}\n\nTo fix, run:\n\n\`\`\`\n${cmds}\n\`\`\``;

  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath) {
    console.log("No event context; skipping review");
    return;
  }
  const event = JSON.parse(await fs.readFile(eventPath, "utf8"));
  const prNumber = event.pull_request?.number;
  if (!prNumber) {
    console.log("No PR number; skipping review");
    return;
  }
  const repo = process.env.GITHUB_REPOSITORY!;
  const token = process.env.GITHUB_TOKEN;
  await fetch(
    `https://api.github.com/repos/${repo}/pulls/${prNumber}/reviews`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ event: "REQUEST_CHANGES", body }),
    },
  ).then((r) => {
    if (!r.ok) {
      console.error("Failed to create review", r.status, r.statusText);
    }
  });
}

main().catch((err) => {
  console.error(err);
});
