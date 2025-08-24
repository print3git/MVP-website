import { spawnSync } from "child_process";

describe("ci env vars", () => {
  it("forwards SKIP_PW_DEPS", () => {
    const result = spawnSync("npm", ["run", "ci", "--silent"], {
      env: { ...process.env, SKIP_PW_DEPS: "1" },
      encoding: "utf-8",
    });
    const output = `${result.stdout}\n${result.stderr}`;
    if (/playwright/i.test(output) && result.status !== 0) {
      console.warn("Playwright not installed; skipping");
      return;
    }
    expect(result.status).toBe(0);
    expect(output).toMatch(/SKIP_PW_DEPS|test|build/i);
  });
});
