import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

describe("test inventory generator", () => {
  it("creates a non-empty inventory", () => {
    const res = spawnSync("npm", ["run", "gen:test-inventory"], {
      encoding: "utf8",
    });
    expect(res.status).toBe(0);
    const file = path.join(process.cwd(), "test-inventory", "current.json");
    expect(existsSync(file)).toBe(true);
    const data = JSON.parse(readFileSync(file, "utf8"));
    expect(data.totals.count).toBeGreaterThan(0);
  });
});
