const { execSync } = require("child_process");
const path = require("path");

const results = JSON.parse(
  execSync("npx eslint . -f json", { encoding: "utf8" }),
);

describe("lint results by file", () => {
  results.forEach((res) => {
    const relative = path.relative(process.cwd(), res.filePath);
    test(`${relative} has no lint errors`, () => {
      const messages = res.messages.filter((m) => m.severity === 2);
      expect(messages).toEqual([]);
    });
  });
});

describe("lint results by rule", () => {
  const byRule = {};
  results.forEach((res) => {
    res.messages.forEach((m) => {
      const rule = m.ruleId || "(no rule)";
      byRule[rule] ||= [];
      byRule[rule].push(
        `${path.relative(process.cwd(), res.filePath)}:${m.line}`,
      );
    });
  });
  Object.keys(byRule).forEach((rule) => {
    test(`no violations of ${rule}`, () => {
      expect(byRule[rule]).toEqual([]);
    });
  });
});
