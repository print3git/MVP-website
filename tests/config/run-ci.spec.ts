import { spawnSync } from "child_process";

describe("ci script", () => {
  it("runs via npm run ci", () => {
    const result = spawnSync("npm", ["run", "ci", "--silent"], {
      env: { ...process.env, SKIP_PW_DEPS: "1" },
      encoding: "utf-8",
    });
    const output = `${result.stdout}\n${result.stderr}`;
    expect(result.status).toBe(0);
    expect(output).toMatch(/test|build/i);
  });
});
