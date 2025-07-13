const fs = require("fs");
const path = require("path");

describe("smoke script wait-on", () => {
  test("run-smoke.js invokes wait-on via npx", () => {
    const content = fs.readFileSync(
      path.join(__dirname, "..", "scripts", "run-smoke.js"),
      "utf8",
    );
    expect(content).toMatch(/npx -y wait-on/);
  });
});
