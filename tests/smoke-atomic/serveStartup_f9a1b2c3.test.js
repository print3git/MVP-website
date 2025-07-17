const { spawn } = require("child_process");
const net = require("net");
const path = require("path");

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

test("npm run serve starts on port 3000", async () => {
  const proc = spawn("npm", ["run", "serve"], {
    cwd: repoRoot,
    env: { ...process.env, PORT: "3000", SKIP_PW_DEPS: "1" },
    stdio: "ignore",
  });
  await waitPort(3000);
  proc.kill("SIGTERM");
});
