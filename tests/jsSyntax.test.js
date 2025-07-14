const fs = require("fs");
const path = require("path");
const parser = require("@babel/parser");

describe("frontend scripts", () => {
  test("index.js parses without syntax errors", () => {
    const file = path.join(__dirname, "..", "js", "index.js");
    const code = fs.readFileSync(file, "utf8");
    expect(() =>
      parser.parse(code, { sourceType: "module", plugins: ["dynamicImport"] }),
    ).not.toThrow();
  });
});
