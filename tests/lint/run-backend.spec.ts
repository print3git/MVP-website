import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

describe("npm run lint in backend", () => {
  const backendDir = path.resolve(__dirname, "../../backend");
  if (!existsSync(backendDir)) {
    it.skip("backend directory missing", () => {});
    return;
  }

  it("completes successfully", () => {
    const result = spawnSync(
      "npm",
      ["run", "lint", "--prefix", "backend", "--silent"],
      {
        encoding: "utf8",
        timeout: 120000,
        maxBuffer: 10 * 1024 * 1024,
      },
    );
    const output = `${result.stdout}${result.stderr}`;
    expect(result.status).toBe(0);
    expect(output).toMatch(/eslint|\d+\s*(?:problem|error|warning|file)/i);
  });
});
