#!/usr/bin/env node
const { spawnSync } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const total = parseInt(process.env.JEST_SHARD_TOTAL || "1", 10);
const index = parseInt(process.env.JEST_SHARD_INDEX || "1", 10);

const list = spawnSync(
  "node",
  [path.join(__dirname, "run-jest.js"), "--listTests"],
  { encoding: "utf8" },
);
if (list.status !== 0) {
  process.exit(list.status);
}
const allTests = list.stdout.trim().split(/\r?\n/).filter(Boolean);
const selected = allTests.filter((t) => {
  const hash = crypto.createHash("sha1").update(t).digest("hex");
  const shard = (parseInt(hash.slice(0, 8), 16) % total) + 1;
  return shard === index;
});
if (selected.length === 0) {
  console.log(`Shard ${index}/${total}: no tests to run`);
  process.exit(0);
}
const jsonReport = path.join("jest-results-" + index + ".json");
const junitDir = path.join("junit");
const junitFile = path.join(junitDir, `junit-${index}.xml`);
const coverageDir = path.join("coverage", `shard-${index}`);
fs.mkdirSync(junitDir, { recursive: true });
fs.mkdirSync(coverageDir, { recursive: true });

const jestArgs = [
  path.join(__dirname, "run-jest.js"),
  "--ci",
  "--runTestsByPath",
  ...selected,
  "--json",
  `--outputFile=${jsonReport}`,
  "--coverage",
  "--coverageReporters=lcov",
  `--coverageDirectory=${coverageDir}`,
];
const result = spawnSync("node", jestArgs, { stdio: "inherit" });
if (result.status !== 0) {
  process.exit(result.status);
}
const data = JSON.parse(fs.readFileSync(jsonReport, "utf8"));
function escapeXml(str) {
  return str.replace(/[<>&"']/g, (c) => {
    switch (c) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case '"':
        return "&quot;";
      case "'":
        return "&apos;";
      default:
        return c;
    }
  });
}
let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
xml += `<testsuites tests="${data.numTotalTests}" failures="${data.numFailedTests}">\n`;
for (const suite of data.testResults) {
  const cases = suite.assertionResults || [];
  const failCount = cases.filter((c) => c.status !== "passed").length;
  xml += `  <testsuite name="${escapeXml(suite.name)}" tests="${cases.length}" failures="${failCount}">\n`;
  for (const c of cases) {
    xml += `    <testcase classname="${escapeXml(suite.name)}" name="${escapeXml(c.title)}">`;
    if (c.status !== "passed") {
      const msg = escapeXml(c.failureMessages.join("\n"));
      xml += `\n      <failure>${msg}</failure>\n    `;
    }
    xml += `</testcase>\n`;
  }
  xml += `  </testsuite>\n`;
}
xml += `</testsuites>\n`;
fs.writeFileSync(junitFile, xml);
console.log(`JUnit report written to ${junitFile}`);
