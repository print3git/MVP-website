const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  generatePrompts,
} = require("../../scripts/autofix/generate-prompts.js");

test("B prompts require at least 10 tests and slugs/titles are unique", async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "autofix-"));
  const inboxDir = path.join(tmp, "in");
  const outDir = path.join(tmp, "out");
  fs.mkdirSync(inboxDir);
  fs.mkdirSync(outDir);

  const issue1 = {
    id: 1,
    title: "First issue",
    paths: ["src/a.js"],
    logs: "error a",
  };
  const issue2 = {
    id: 2,
    title: "Second issue",
    paths: ["src/b.js"],
    logs: "error b",
  };
  fs.writeFileSync(path.join(inboxDir, "1.json"), JSON.stringify(issue1));
  fs.writeFileSync(path.join(inboxDir, "2.json"), JSON.stringify(issue2));

  await generatePrompts({
    inboxDir,
    outDir,
    templatesDir: path.join(
      process.cwd(),
      "config",
      "autofix",
      "prompt-templates",
    ),
  });

  const outFiles = fs.readdirSync(outDir);
  const slugs = [];
  const titles = [];
  for (const file of outFiles) {
    const content = fs.readFileSync(path.join(outDir, file), "utf8");
    const slugMatch = content.match(/SLUG:\s*(.*)/);
    if (slugMatch) slugs.push(slugMatch[1]);
    const titleMatch = content.match(/^#\s*(.*)$/m);
    if (titleMatch) titles.push(titleMatch[1]);
    if (file.endsWith("-B.md")) {
      expect(content).toMatch(/at least 10/);
    }
  }
  expect(new Set(slugs).size).toBe(slugs.length);
  expect(new Set(titles).size).toBe(titles.length);
});
