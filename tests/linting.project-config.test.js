const path = require("path");
const fs = require("fs/promises");
const { ESLint } = require("eslint");

describe("parserOptions.project", () => {
  const tmpDir = path.join(__dirname, "__tmp");
  const sample = path.join(tmpDir, "sample.ts");
  const originalCI = process.env.CI;

  beforeAll(async () => {
    await fs.mkdir(tmpDir, { recursive: true });
    await fs.writeFile(sample, "export {};\n");
    delete process.env.CI;
  });

  afterAll(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
    if (originalCI !== undefined) process.env.CI = originalCI;
  });

  it("includes tsconfig project and env", async () => {
    const eslint = new ESLint();
    const config = await eslint.calculateConfigForFile(sample);
    expect(config.languageOptions.parserOptions.project).toEqual(
      expect.arrayContaining([expect.stringContaining("tsconfig.json")]),
    );
    expect(config.languageOptions.globals).toMatchObject({
      module: false,
      describe: false,
    });
  });
});
