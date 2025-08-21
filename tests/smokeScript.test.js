const fs = require("fs");
const path = require("path");
const pkg = require("../package.json");

describe("smoke script", () => {
  test("uses run-smoke.js", () => {
    expect(pkg.scripts.smoke).toBe("node scripts/run-smoke.js");
  });

  test("run-smoke.js validates env and does not run setup", () => {
    const content = fs.readFileSync(
      path.join(__dirname, "..", "scripts", "run-smoke.js"),
      "utf8",
    );
    expect(content).toMatch(/npm run validate-env/);
    expect(content).not.toMatch(/npm run setup/);
  });

  test("run-smoke.js loads env file values", () => {
    jest.isolateModules(() => {
      const { env } = require("../scripts/run-smoke.js");
      expect(env.AWS_ACCESS_KEY_ID).toBe("your-aws-access-key-id");
      expect(env.AWS_SECRET_ACCESS_KEY).toBe("your-aws-secret-access-key");
      expect(env.DB_URL).toBe(
        "postgres://user:password@localhost:5432/your_database",
      );
      expect(env.STRIPE_SECRET_KEY).toBe("sk_test_...");
    });
  });
});
