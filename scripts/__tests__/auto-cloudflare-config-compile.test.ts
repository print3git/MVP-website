import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";

const script = path.resolve(__dirname, "..", "auto-cloudflare-config.ts");
const tsNodeArgs = [
  "-y",
  "ts-node",
  "--transpile-only",
  "--compiler-options",
  JSON.stringify({ module: "CommonJS", moduleResolution: "node" }),
  script,
];

test("auto-cloudflare-config compiles", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cf-test-"));
  fs.writeFileSync(
    path.join(tmp, "package.json"),
    JSON.stringify({ dependencies: {}, devDependencies: {} }),
  );
  const cfg = path.join(tmp, "cfg.json");
  const result = spawnSync("npx", [...tsNodeArgs, cfg], {
    encoding: "utf8",
    cwd: tmp,
  });
  expect(result.status).toBe(0);
  expect(fs.existsSync(cfg)).toBe(true);
  fs.rmSync(tmp, { recursive: true, force: true });
});
