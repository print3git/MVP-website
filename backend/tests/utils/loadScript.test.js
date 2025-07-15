const fs = require("fs");
const path = require("path");
const loadScript = require("./loadScript");

test("strips ES module syntax", () => {
  const testFile = path.join(__dirname, "tmp.js");
  fs.writeFileSync(
    testFile,
    'import { x } from "./mod.js";\nexport { y };\nconst a = 1;',
  );
  const result = loadScript(
    path.relative(path.join(__dirname, "..", "..", ".."), testFile),
  );
  fs.unlinkSync(testFile);
  expect(result).toBe("const a = 1;");
});
