#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const fg = require("fast-glob");
const { ESLint } = require("eslint");

const dirArg = process.argv.find((a) => a.startsWith("--dir="));
const targetDir = dirArg ? dirArg.split("=")[1] : "backend/src";

(async () => {
  const eslint = new ESLint({
    cwd: process.cwd(),
    overrideConfigFile: true,
    overrideConfig: [
      {
        languageOptions: { ecmaVersion: 2020, sourceType: "module" },
        plugins: { jsdoc: require("eslint-plugin-jsdoc") },
        rules: { "jsdoc/require-jsdoc": "error" },
      },
    ],
  });

  const files = await fg(["**/*.js", "**/*.ts"], {
    cwd: targetDir,
    absolute: true,
  });

  const rows = [];

  for (const file of files) {
    const results = await eslint.lintFiles([file]);
    const messages = results[0].messages.filter(
      (m) =>
        m.ruleId === "jsdoc/require-jsdoc" && m.messageId === "missingJsDoc",
    );
    if (!messages.length) continue;
    const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
    for (const m of messages) {
      const rel = path.relative(process.cwd(), file);
      const lineText = lines[m.line - 1] || "";
      const name =
        (m.node && (m.node.id?.name || m.node.key?.name)) ||
        lineText.match(/function\s+([\w$]+)/)?.[1] ||
        lineText.match(
          /([\w$]+)\s*[:=]\s*(?:async\s*)?(?:function\s*)?\(/,
        )?.[1] ||
        "";
      rows.push({ file: rel, line: m.line, name, signature: lineText.trim() });
    }
  }

  if (rows.length) {
    console.log("| File | Line | Name | Signature |");
    console.log("| ---- | ---- | ---- | --------- |");
    for (const r of rows) {
      console.log(`| ${r.file} | ${r.line} | ${r.name} | \`${r.signature}\` |`);
    }
    process.exit(1);
  } else {
    console.log("✅ All functions have JSDoc comments.");
    process.exit(0);
  }
})();
