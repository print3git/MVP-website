const fs = require("fs");
const path = require("path");
const parser = require("@babel/parser");

function getJsFiles(dir) {
  let files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const res = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(getJsFiles(res));
    } else if (res.endsWith(".js") && !res.endsWith(".min.js")) {
      if (!res.endsWith("my_profile.js")) files.push(res);
    }
  }
  return files;
}

describe("frontend js syntax", () => {
  const files = getJsFiles(path.join(__dirname, "../js"));
  for (const file of files) {
    test(`${file} parses`, () => {
      const code = fs.readFileSync(file, "utf8");
      expect(() =>
        parser.parse(code, { sourceType: "unambiguous" }),
      ).not.toThrow();
    });
  }
});
