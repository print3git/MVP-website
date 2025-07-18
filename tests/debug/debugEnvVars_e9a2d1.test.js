const critical = [
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "DB_URL",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "CLOUDFRONT_MODEL_DOMAIN",
  "HF_TOKEN",
  "HF_API_KEY",
];

function isPlaceholder(value) {
  if (!value) return true;
  if (value.endsWith("...")) return true;
  if (/your[_-]/i.test(value)) return true;
  if (value === "postgres://user:password@localhost:5432/your_database")
    return true;
  return false;
}

describe("debug environment variables", () => {
  test("validate critical vars", () => {
    const invalid = [];
    const validated = [];
    for (const name of critical) {
      const val = process.env[name];
      console.log(`${name}=${val}`);
      if (isPlaceholder(val)) {
        invalid.push(`${name} invalid: ${val}`);
      } else {
        validated.push(name);
      }
    }
    console.log("Validated env vars: " + validated.join(", "));
    if (invalid.length) {
      throw new Error(invalid.join("; "));
    }
  });
});
