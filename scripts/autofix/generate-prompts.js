#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

function branchSafe(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function generatePrompts(opts = {}) {
  const repoRoot = process.cwd();
  const inboxDir =
    opts.inboxDir ||
    process.env.AUTOFIX_INBOX ||
    path.join(repoRoot, "ci", "autofix", "inbox");
  const outDir =
    opts.outDir ||
    process.env.AUTOFIX_OUT ||
    path.join(repoRoot, "ci", "autofix", "out");
  const templatesDir =
    opts.templatesDir ||
    path.join(repoRoot, "config", "autofix", "prompt-templates");

  await fs.promises.mkdir(outDir, { recursive: true });
  const [tmplA, tmplB] = await Promise.all([
    fs.promises.readFile(path.join(templatesDir, "fix.md"), "utf8"),
    fs.promises.readFile(
      path.join(templatesDir, "regression-suite.md"),
      "utf8",
    ),
  ]);

  const files = (await fs.promises.readdir(inboxDir)).filter((f) =>
    f.endsWith(".json"),
  );
  const usedSlugs = new Set();

  for (const file of files) {
    const raw = await fs.promises.readFile(path.join(inboxDir, file), "utf8");
    const data = JSON.parse(raw);
    const id = data.issue?.id || data.id;
    if (!id) continue;
    const title = data.issue?.title || data.title || `Issue ${id}`;
    const slugBase = branchSafe(`${process.env.SLUG || "autofix"}-${id}`);
    const slugA = `${slugBase}-a`;
    const slugB = `${slugBase}-b`;
    if (usedSlugs.has(slugA) || usedSlugs.has(slugB)) {
      throw new Error(`Duplicate slug detected for issue ${id}`);
    }
    usedSlugs.add(slugA);
    usedSlugs.add(slugB);
    const paths = (data.paths || []).join("\n");
    const logs = data.logs || "";

    const apply = (tmpl, slug) =>
      tmpl
        .replace(/{{title}}/g, title)
        .replace(/{{slug}}/g, slug)
        .replace(/{{issueId}}/g, String(id))
        .replace(/{{paths}}/g, paths)
        .replace(/{{logs}}/g, logs);

    await fs.promises.writeFile(
      path.join(outDir, `${id}-A.md`),
      apply(tmplA, slugA),
    );
    await fs.promises.writeFile(
      path.join(outDir, `${id}-B.md`),
      apply(tmplB, slugB),
    );
  }
}

if (require.main === module) {
  generatePrompts().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { generatePrompts, branchSafe };
