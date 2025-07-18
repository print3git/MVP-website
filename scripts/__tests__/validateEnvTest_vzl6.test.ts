const { execSync } = require("child_process");

test("fails when required env vars are missing", () => {
  let error;
  try {
    execSync(
      "AWS_ACCESS_KEY_ID= AWS_SECRET_ACCESS_KEY= DB_URL= STRIPE_SECRET_KEY= SKIP_DB_CHECK=1 SKIP_NET_CHECKS=1 SKIP_PW_DEPS=1 bash scripts/validate-env.sh",
      { encoding: "utf8", stdio: "pipe" },
    );
  } catch (e) {
    error = e;
  }
  expect(error).toBeDefined();
  const output = (error.stdout || "") + (error.stderr || "");
  expect(output).toMatch(/Missing required environment variables:/);
});
