import { readFileSync } from "fs";
import { join } from "path";

describe("package scripts", () => {
  const pkg = JSON.parse(
    readFileSync(join(__dirname, "..", "..", "package.json"), "utf-8"),
  );
  const scripts = pkg.scripts ?? {};

  ["ci", "test", "build"].forEach((name) => {
    it(`has ${name} script`, () => {
      expect(typeof scripts[name]).toBe("string");
      expect(scripts[name]).toBeTruthy();
    });
  });
});
