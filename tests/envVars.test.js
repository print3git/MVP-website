const requiredVars = [
  "HF_TOKEN",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "DB_URL",
  "STRIPE_SECRET_KEY",
];

describe("required environment variables", () => {
  for (const name of requiredVars) {
    test(`${name} is defined`, () => {
      expect(process.env[name]).toBeDefined();
      expect(process.env[name]).not.toBe("");
    });
  }
});
