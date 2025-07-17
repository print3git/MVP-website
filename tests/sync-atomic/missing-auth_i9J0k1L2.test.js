const fs = require("fs");
const path = require("path");
const { sync } = require("./hfSync");

describe("Missing auth vars", () => {
  test("throws when HF_TOKEN absent", () => {
    const temp = fs.mkdtempSync(path.join(__dirname, "repo-"));
    expect(() => sync({ repo: "owner/repo", dest: temp })).toThrow(/HF_TOKEN/);
  });
});
