import fs from "fs";
import path from "path";

describe("ci completion guard", () => {
  test("all previous stages completed", () => {
    const repoRoot = path.resolve(__dirname, "..");
    const files = [
      ["audit log", path.join(repoRoot, "ci-test-audit.log")],
      ["coverage", path.join(repoRoot, "coverage", "lcov.info")],
      ["smoke log", path.join(repoRoot, "pw.log")],
      ["serve log", path.join(repoRoot, "serve.log")],
    ];

    const contents = [];
    for (const [label, file] of files) {
      expect(fs.existsSync(file)).toBe(true);
      const data = fs.readFileSync(file, "utf8").trim();
      expect(data).not.toBe("");
      contents.push(data);
      if (label === "coverage") {
        expect(/^TN:/m.test(data)).toBe(true);
      }
    }

    const audit = contents[0];
    expect(audit).toMatch(/files=\d+/);
    expect(audit).toMatch(/tests=\d+/);

    const all = contents.join("\n");
    expect(/setup/i.test(all)).toBe(true);
    expect(/smoke/i.test(all)).toBe(true);
    expect(/coverage/i.test(all)).toBe(true);
    expect(/pipeline/i.test(all)).toBe(true);
  });
});
