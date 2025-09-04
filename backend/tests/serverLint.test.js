const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function runLint(target) {
  if (!/^[\w./-]+$/.test(target)) {
    throw new Error("invalid lint target");
  }
  const safePath = /^[\w/:.-]+$/.test(process.env.PATH || "")
    ? process.env.PATH
    : "/usr/bin";
  const eslintCmd = path.resolve(
    __dirname,
    "..",
    "..",
    "node_modules",
    ".bin",
    "eslint",
  );
  const targetPath = path.resolve(__dirname, target);
  const res = spawnSync(process.execPath, [eslintCmd, targetPath], {
    stdio: "pipe",
    env: { ...process.env, PATH: safePath },
  });
  if (res.error) {
    throw res.error;
  }
  if (res.status !== 0) {
    throw new Error(res.stderr.toString());
  }
}

test("server.ts passes eslint", () => {
  const serverFile = path.join(__dirname, "..", "src", "server.ts");
  expect(fs.existsSync(serverFile)).toBe(true);
  expect(() => runLint(serverFile)).not.toThrow();
});

test("rejects unsafe lint target", () => {
  const bad = "src/server.ts; rm -rf /";
  expect(() => runLint(bad)).toThrow(/invalid lint target/);
});

test("allows safe relative path", () => {
  const rel = "../src/server.ts";
  expect(() => runLint(rel)).not.toThrow();
});
