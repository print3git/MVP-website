const { ESLint } = require("eslint");

describe("test file env overrides", () => {
  it("recognises jest globals in *.test.ts", async () => {
    const code =
      "describe('suite', () => { it('works', () => { expect(1).toBe(1); }); });";
    const eslint = new ESLint({
      overrideConfig: { languageOptions: { parserOptions: { project: null } } },
    });
    const [result] = await eslint.lintText(code, {
      filePath: "sample.test.ts",
    });
    expect(result.errorCount).toBe(0);
    expect(result.warningCount).toBe(0);
    const noUndef = result.messages.filter((m) => m.ruleId === "no-undef");
    expect(noUndef).toHaveLength(0);
  });
});
