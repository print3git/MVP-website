const criticalVars = [
  "STRIPE_SECRET_KEY",
  "HF_API_KEY",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "DB_URL",
];

describe("critical env vars", () => {
  criticalVars.forEach((name) => {
    test(`${name} is defined`, () => {
      const value = process.env[name];
      if (!value) {
        throw new Error(
          `🚫 Critical env var ${name} is undefined — generator pipeline cannot proceed.`,
        );
      }
      expect(value).not.toEqual("");
    });
  });
});
