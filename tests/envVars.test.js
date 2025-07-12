const requiredVars = ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"];
const tokenVars = ["HF_TOKEN", "HF_API_KEY"];

describe("required environment variables", () => {
  for (const name of requiredVars) {
    test(`${name} is defined`, () => {
      expect(process.env[name]).toBeDefined();
      expect(process.env[name]).not.toBe("");
    });
  }
  test("HF_TOKEN or HF_API_KEY is defined", () => {
    const defined = tokenVars.some((v) => process.env[v]);
    expect(defined).toBe(true);
  });
});
