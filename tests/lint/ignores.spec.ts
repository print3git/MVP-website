import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

function checkIgnore(file: string) {
  const contents = readFileSync(file, "utf8");
  const patterns = [
    "node_modules",
    "dist",
    "build",
    "coverage",
    ".next",
    "**/generated",
  ];
  patterns.forEach((p) => {
    expect(contents).toContain(p);
  });
}

describe(".eslintignore coverage", () => {
  const rootIgnore = path.resolve(__dirname, "../../.eslintignore");
  if (existsSync(rootIgnore)) {
    it("root ignore file contains standard patterns", () => {
      checkIgnore(rootIgnore);
    });
  } else {
    it.skip("root .eslintignore missing", () => {});
  }

  const backendIgnore = path.resolve(__dirname, "../../backend/.eslintignore");
  if (existsSync(backendIgnore)) {
    it("backend ignore file contains standard patterns", () => {
      checkIgnore(backendIgnore);
    });
  } else {
    it.skip("backend .eslintignore missing", () => {});
  }
});
