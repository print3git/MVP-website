import { spawnSync } from "node:child_process";

describe("npm run lint at root", () => {
  it("completes successfully", () => {
    const result = spawnSync("npm", ["run", "lint", "--silent"], {
      encoding: "utf8",
      timeout: 120000,
      maxBuffer: 10 * 1024 * 1024,
    });
    const output = `${result.stdout}${result.stderr}`;
    expect(result.status).toBe(0);
    expect(output).toMatch(/eslint|\d+\s*(?:problem|error|warning|file)/i);
  });
});
