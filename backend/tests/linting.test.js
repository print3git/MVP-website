const { spawnSync } = require("child_process");

describe("linting", () => {
  test("repository has no ESLint warnings", () => {
    const result = spawnSync("npm", ["run", "lint", "--silent"], {
      encoding: "utf8",
    });
    if (result.error) throw result.error;
    expect(result.status).toBe(0);
  });
});
