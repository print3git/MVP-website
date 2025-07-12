const { execSync } = require("child_process");
const path = require("path");

const script = path.join(__dirname, "..", "..", "scripts", "validate-env.sh");

describe("validate-env AWS checks", () => {
  test("fails when STABILITY_KEY set without AWS creds", () => {
    expect(() =>
      execSync(`bash ${script}`, {
        env: {
          ...process.env,
          STABILITY_KEY: "key",
          AWS_ACCESS_KEY_ID: "",
          AWS_SECRET_ACCESS_KEY: "",
          STRIPE_TEST_KEY: "sk",
          HF_TOKEN: "t",
        },
        stdio: "pipe",
      }),
    ).toThrow();
  });

  test("passes with STABILITY_KEY and AWS creds", () => {
    expect(() =>
      execSync(`bash ${script}`, {
        env: {
          ...process.env,
          STABILITY_KEY: "key",
          AWS_ACCESS_KEY_ID: "id",
          AWS_SECRET_ACCESS_KEY: "secret",
          STRIPE_TEST_KEY: "sk",
          HF_TOKEN: "t",
        },
        stdio: "pipe",
      }),
    ).not.toThrow();
  });
});
