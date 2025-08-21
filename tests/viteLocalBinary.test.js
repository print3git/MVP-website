const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawnSync } = require("child_process");

test("uses local node_modules/.bin/vite", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "vite-bin-"));
  const fakeVite = path.join(tmpDir, "vite");
  fs.writeFileSync(fakeVite, "#!/bin/sh\necho global-vite >&2\nexit 1\n");
  fs.chmodSync(fakeVite, 0o755);

  const env = {
    ...process.env,
    PATH: `${tmpDir}${path.delimiter}${process.env.PATH}`,
  };

  const result = spawnSync(
    "npm",
    ["run", "build", "--prefix", "frontend", "--", "--help"],
    { env, encoding: "utf8" },
  );

  expect(result.status).toBe(0);
  expect(result.stderr || "").not.toContain("global-vite");
});
