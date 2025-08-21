import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

describe("ci_watchdog helpers", () => {
  test("globWalk finds files recursively", async () => {
    process.env.GITHUB_ACTION = "1";
    process.env.GITHUB_TOKEN = "test";
    process.env.GITHUB_REPOSITORY = "owner/repo";
    const { globWalk } = await import("../../scripts/ci_watchdog");
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "watchdog-"));
    const nested = path.join(tmp, "a/b");
    await fs.mkdir(nested, { recursive: true });
    const file1 = path.join(tmp, "one.yml");
    const file2 = path.join(nested, "two.yml");
    await fs.writeFile(file1, "");
    await fs.writeFile(file2, "");
    await fs.writeFile(path.join(tmp, "ignore.txt"), "");

    const result = await globWalk(tmp, ".yml");
    expect(result.sort()).toEqual([file1, file2].sort());

    await fs.rm(tmp, { recursive: true, force: true });
  });

  test("patchFiles replaces matches", async () => {
    process.env.GITHUB_ACTION = "1";
    process.env.GITHUB_TOKEN = "test";
    process.env.GITHUB_REPOSITORY = "owner/repo";
    const { patchFiles } = await import("../../scripts/ci_watchdog");
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "watchdog-"));
    await fs.mkdir(path.join(tmp, ".github/workflows"), { recursive: true });
    const dockerfile = path.join(tmp, "Dockerfile");
    await fs.writeFile(dockerfile, "npm ci --no-audit --no-fund");
    const cwd = process.cwd();
    process.chdir(tmp);
    try {
      const changed = await patchFiles(
        /npm ci --no-audit --no-fund/g,
        "npm install --no-audit --no-fund",
      );
      const content = await fs.readFile(dockerfile, "utf8");
      expect(changed).toBe(true);
      expect(content).toBe("npm install --no-audit --no-fund");
    } finally {
      process.chdir(cwd);
      await fs.rm(tmp, { recursive: true, force: true });
    }
  });
});
