import { describe, it, expect } from "vitest";

describe("GitHub CI Secrets Check", () => {
  const requiredVars = [
    "STRIPE_SECRET_KEY",
    "DB_URL",
    "HF_API_KEY",
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
    "SPARC3D_TOKEN",
    "STABILITY_KEY",
  ];

  it("should have all required secrets defined", () => {
    for (const key of requiredVars) {
      expect(process.env[key], `${key} is missing`).toBeTruthy();
    }
  });
});
