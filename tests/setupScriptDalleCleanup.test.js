const fs = require("fs");

describe("setup script includes dalle_server cleanup", () => {
  test("rimraf path contains backend/dalle_server", () => {
    const content = fs.readFileSync("scripts/setup.sh", "utf8");
    expect(content).toMatch("backend/dalle_server/node_modules");
  });
});
