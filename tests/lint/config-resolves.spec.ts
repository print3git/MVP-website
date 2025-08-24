import path from "node:path";
import { existsSync } from "node:fs";

describe("eslint config resolves", () => {
  const rootConfigPath = path.resolve(__dirname, "../../eslint.config.js");

  it("loads root config and checks tsconfig references", () => {
    const load = () => require(rootConfigPath);
    expect(load).not.toThrow();
    const config = load();
    config
      .filter((c: any) => c?.languageOptions?.parserOptions?.project)
      .forEach((c: any) => {
        const projects = Array.isArray(c.languageOptions.parserOptions.project)
          ? c.languageOptions.parserOptions.project
          : [c.languageOptions.parserOptions.project];
        const tsconfigRootDir =
          c.languageOptions.parserOptions.tsconfigRootDir ||
          path.dirname(rootConfigPath);
        projects.forEach((p: string) => {
          const tsconfigPath = path.resolve(tsconfigRootDir, p);
          expect(existsSync(tsconfigPath)).toBe(true);
        });
      });
  });

  const backendConfigPath = path.resolve(
    __dirname,
    "../../backend/eslint.config.js",
  );
  if (existsSync(backendConfigPath)) {
    it("loads backend config and checks tsconfig references", () => {
      const load = () => require(backendConfigPath);
      expect(load).not.toThrow();
      const config = load();
      config
        .filter((c: any) => c?.languageOptions?.parserOptions?.project)
        .forEach((c: any) => {
          const projects = Array.isArray(
            c.languageOptions.parserOptions.project,
          )
            ? c.languageOptions.parserOptions.project
            : [c.languageOptions.parserOptions.project];
          const tsconfigRootDir =
            c.languageOptions.parserOptions.tsconfigRootDir ||
            path.dirname(backendConfigPath);
          projects.forEach((p: string) => {
            const tsconfigPath = path.resolve(tsconfigRootDir, p);
            expect(existsSync(tsconfigPath)).toBe(true);
          });
        });
    });
  } else {
    it.skip("backend eslint config not found", () => {});
  }
});
