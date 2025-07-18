const patterns = [/your-/i, /localhost/i, /sk_test_/i, /abc123/i];

describe("environment variable sanity check", () => {
  test("no placeholder values present", () => {
    const offenders = [];
    for (const [key, value] of Object.entries(process.env)) {
      if (typeof value !== "string") continue;
      if (patterns.some((re) => re.test(value))) {
        offenders.push(key);
      }
    }
    if (offenders.length) {
      throw new Error(`Placeholder values found in: ${offenders.join(", ")}`);
    }
  });
});
