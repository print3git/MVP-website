const { spawn } = require("child_process");
const net = require("net");
const path = require("path");
const fetch = require("node-fetch");

const repoRoot = path.resolve(__dirname, "..", "..");

function waitPort(port, timeout = 5000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    (function check() {
      const socket = net.connect(port, "127.0.0.1");
      socket.once("error", () => {
        socket.destroy();
        if (Date.now() - start > timeout) return reject(new Error("timeout"));
        setTimeout(check, 100);
      });
      socket.once("connect", () => {
        socket.end();
        resolve();
      });
    })();
  });
}

test("api generate endpoint returns json", async () => {
  const proc = spawn("npm", ["run", "serve"], {
    cwd: repoRoot,
    env: { ...process.env, PORT: "3000", SKIP_PW_DEPS: "1" },
    stdio: "ignore",
  });
  await waitPort(3000);
  const res = await fetch("http://localhost:3000/api/generate", {
    method: "POST",
  });
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(typeof body.glb_url).toBe("string");
  proc.kill("SIGTERM");
});
