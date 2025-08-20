require("./helpers/run-eslint");
const fs = require("fs/promises");
const path = require("path");
const { ESLint } = require("eslint");

const ROOT = path.join(__dirname, "..");
const DIRS = ["dist", "build", "coverage"];

describe(".eslintignore", () => {
  const created = new Map();

  beforeAll(async () => {
    for (const dir of DIRS) {
      const target = path.join(ROOT, dir, "eslint-ignore-test");
      try {
        await fs.access(path.join(ROOT, dir));
        created.set(dir, false);
      } catch {
        created.set(dir, true);
        await fs.mkdir(path.join(ROOT, dir), { recursive: true });
      }
      await fs.mkdir(target, { recursive: true });
      await fs.writeFile(path.join(target, "tmp.ts"), "export {};\n");
    }
  });

  afterAll(async () => {
    for (const dir of DIRS) {
      const target = path.join(ROOT, dir, "eslint-ignore-test");
      await fs.rm(target, { recursive: true, force: true });
      if (created.get(dir)) {
        await fs.rm(path.join(ROOT, dir), { recursive: true, force: true });
      }
    }
  });

  it.skip("ignores dist, build, and coverage", async () => {
    // TODO: Re-enable once ESLint supports .eslintignore with flat config.
  });
});
