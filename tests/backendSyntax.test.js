const fs = require("fs");
const path = require("path");
const parser = require("@babel/parser");

function getTsFiles(dir) {
  let files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const res = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(getTsFiles(res));
    } else if (res.endsWith(".ts")) {
      files.push(res);
    }
  }
  return files;
}

describe("backend test syntax", () => {
  const files = getTsFiles(path.join(__dirname, "../backend/tests"));
  for (const file of files) {
    test(`${file} parses`, () => {
      const code = fs.readFileSync(file, "utf8");
      expect(() =>
        parser.parse(code, { sourceType: "script", plugins: ["typescript"] }),
      ).not.toThrow();
    });
  }
});
