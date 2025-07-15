const { execSync } = require("child_process");

test("no-unused-vars lint rule passes", () => {
  const output = execSync("npx eslint . -f json", { encoding: "utf8" });
  const results = JSON.parse(output);
  const unused = results
    .flatMap((r) => r.messages)
    .filter((m) => m.ruleId === "no-unused-vars");
  expect(unused).toEqual([]);
});
