import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";

describe("auto-cloudflare-config script", () => {
  const script = path.resolve(__dirname, "..", "auto-cloudflare-config.ts");
  const tsNodeArgs = [
    "-y",
    "ts-node",
    "--transpile-only",
    "--compiler-options",
    JSON.stringify({ module: "CommonJS", moduleResolution: "node" }),
    script,
  ];

  test("generates config with build command", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cf-"));
    const pkg = { dependencies: { react: "18.0.0" } };
    fs.writeFileSync(path.join(tmp, "package.json"), JSON.stringify(pkg));
    const cfgFile = path.join(tmp, "cloudflare-pages.config.json");
    fs.writeFileSync(cfgFile, "{}");
    const result = spawnSync("npx", [...tsNodeArgs, cfgFile], {
      cwd: tmp,
      encoding: "utf8",
    });
    expect(result.status).toBe(0);
    const cfg = JSON.parse(fs.readFileSync(cfgFile, "utf8"));
    expect(cfg.buildCommand).toBe("npm run build");
    const generated = fs
      .readdirSync(tmp)
      .find(
        (f) => f.startsWith("cloudflare-pages-config-") && f.endsWith(".ts"),
      );
    expect(generated).toBeDefined();
    if (generated) {
      expect(
        generated.slice("cloudflare-pages-config-".length, -3).length,
      ).toBe(15);
    }
  });

  test("fails with malformed config", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cf-"));
    fs.writeFileSync(path.join(tmp, "package.json"), JSON.stringify({}));
    const cfgFile = path.join(tmp, "bad.json");
    fs.writeFileSync(cfgFile, "{bad json");
    const result = spawnSync("npx", [...tsNodeArgs, cfgFile], {
      cwd: tmp,
      encoding: "utf8",
    });
    expect(result.status).not.toBe(0);
  });
});
