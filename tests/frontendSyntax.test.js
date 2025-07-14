const fs = require("fs");
const path = require("path");
const parser = require("@babel/parser");

describe("frontend js syntax", () => {
  const files = [path.join(__dirname, "..", "js", "index.js")];
  for (const file of files) {
    test(`${file} parses`, () => {
      const code = fs.readFileSync(file, "utf8");
      expect(() => parser.parse(code, { sourceType: "module" })).not.toThrow();
    });
  }
});
