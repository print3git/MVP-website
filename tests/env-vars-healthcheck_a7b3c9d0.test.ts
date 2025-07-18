const { execFileSync } = require("child_process");
const path = require("path");

test("ci-health fails when DB_URL missing", () => {
  let error;
  try {
    execFileSync("node", [path.join("scripts", "ci-health.js")], {
      env: {
        ...process.env,
        DB_URL: "",
        STRIPE_SECRET_KEY: "sk_test",
        AWS_ACCESS_KEY_ID: "id",
        AWS_SECRET_ACCESS_KEY: "secret",
      },
      encoding: "utf8",
      stdio: "pipe",
    });
  } catch (e) {
    error = e;
  }
  expect(error).toBeDefined();
  const output = (error.stdout || "") + (error.stderr || "");
  expect(output).toMatch(/Missing required env var: DB_URL/);
});
