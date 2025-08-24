import { describe, test, expect } from "@jest/globals";

describe("test environment", () => {
  test("provides dummy AWS credentials", () => {
    expect(process.env.AWS_ACCESS_KEY_ID).toBeDefined();
    expect(process.env.AWS_SECRET_ACCESS_KEY).toBeDefined();
  });
});
