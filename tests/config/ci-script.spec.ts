import packageJson from "../../package.json";

describe("ci script", () => {
  it("should be defined and non-empty", () => {
    expect(packageJson?.scripts?.ci).toBeDefined();
    expect(typeof packageJson.scripts.ci).toBe("string");
    expect(packageJson.scripts.ci.length).toBeGreaterThan(0);
  });
});
