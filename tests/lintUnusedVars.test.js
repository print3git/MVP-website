const { ESLint } = require("eslint");

test("no unused vars in tests", async () => {
  const eslint = new ESLint({
    useEslintrc: true,
    overrideConfig: {
      rules: { "no-unused-vars": ["error", { argsIgnorePattern: "^_" }] },
    },
  });
  const results = await eslint.lintFiles(["tests/**/*.js"]);
  const unused = results.flatMap((r) =>
    r.messages.filter((m) => m.ruleId === "no-unused-vars"),
  );
  expect(unused).toEqual([]);
});
