const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const backendDir = path.join(repoRoot, "backend");

function findFile(startDir, ext) {
  const entries = fs.readdirSync(startDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const full = path.join(startDir, entry.name);
    if (entry.isDirectory()) {
      const res = findFile(full, ext);
      if (res) return res;
    } else if (entry.isFile() && entry.name.endsWith(ext)) {
      return full;
    }
  }
  return null;
}

function runEslint(cwd, file) {
  const lint = spawnSync("pnpm", ["exec", "eslint", "-f", "json", file], {
    cwd,
    encoding: "utf8",
  });
  if (lint.status !== 0) {
    throw new Error(lint.stdout || lint.stderr);
  }
  const lintResults = JSON.parse(lint.stdout)[0];
  const parseErrors = lintResults.messages.filter(
    (m) => m.fatal || (m.ruleId === null && /Parsing error/.test(m.message)),
  );
  if (parseErrors.length) {
    throw new Error(
      `Parsing errors in ${file}:\n${JSON.stringify(parseErrors, null, 2)}`,
    );
  }
  const conf = spawnSync("pnpm", ["exec", "eslint", "--print-config", file], {
    cwd,
    encoding: "utf8",
  });
  if (conf.status !== 0) {
    throw new Error(conf.stdout || conf.stderr);
  }
  const config = JSON.parse(conf.stdout);
  const parser =
    (config.languageOptions && config.languageOptions.parser) || config.parser;
  const parserOptions =
    (config.languageOptions && config.languageOptions.parserOptions) ||
    config.parserOptions ||
    {};
  return { parser, parserOptions };
}

describe("eslint parserOptions.project resolution", () => {
  const cases = [
    { name: "src", dir: path.join(repoRoot, "src"), cwd: repoRoot },
    { name: "scripts", dir: path.join(repoRoot, "scripts"), cwd: repoRoot },
    { name: "tests", dir: path.join(repoRoot, "tests"), cwd: repoRoot },
    { name: "backend", dir: backendDir, cwd: backendDir },
  ];

  const exts = [".ts", ".tsx", ".js"];

  for (const { name, dir, cwd } of cases) {
    describe(name, () => {
      for (const ext of exts) {
        const file = findFile(dir, ext);
        if (!file) {
          test.skip(`no ${ext} files in ${name}`, () => {});
          continue;
        }
        test(`${ext} parses without errors`, () => {
          const { parser, parserOptions } = runEslint(cwd, file);
          if (ext === ".js") {
            expect(parserOptions.project ?? null).toBeNull();
          } else {
            expect(String(parser)).toContain("typescript-eslint");
            expect(
              parserOptions.project && parserOptions.project.length,
            ).toBeGreaterThan(0);
          }
        });
      }
    });
  }
});
