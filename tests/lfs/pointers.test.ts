import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

describe("lfs pointer checks", () => {
  const root = process.cwd();
  const attrs = readFileSync(join(root, ".gitattributes"), "utf8");

  it("lfs gitattributes covers img png", () => {
    const has = /img\/\*\*/.test(attrs) && /\*.png\s+filter=lfs/.test(attrs);
    expect(has).toBe(true);
  });

  it("lfs gitattributes covers img jpg", () => {
    const has = /img\/\*\*/.test(attrs) && /\*.jpg\s+filter=lfs/.test(attrs);
    expect(has).toBe(true);
  });

  const files = [
    "img/boxlogo.png",
    "img/luckybox-preview.png",
    "img/print2 logo.png",
    "img/textlogo.png",
  ];

  for (const file of files) {
    it(`lfs pointer present for ${file}`, () => {
      const filePath = join(root, file);
      expect(existsSync(filePath)).toBe(true);
      const firstLine = readFileSync(filePath, "utf8").split("\n")[0];
      expect(firstLine).toContain("git-lfs");
    });
  }
});
