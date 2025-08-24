import fs from "fs";
import path from "path";

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === "node_modules" || entry.name === ".git") return [];
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    if (/\.(md|mdx|html)$/.test(entry.name)) return [full];
    return [];
  });
}

describe("documentation guard", () => {
  test("no docs reference /api/generate-model", () => {
    const root = path.join(__dirname, "..", "..");
    const files = walk(root);
    for (const file of files) {
      const content = fs.readFileSync(file, "utf8");
      expect(content).not.toMatch(/\/api\/generate-model/);
    }
  });
});
