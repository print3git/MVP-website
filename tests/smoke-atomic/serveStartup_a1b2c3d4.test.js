const { spawn, execSync } = require("child_process");
const net = require("net");

function waitForPort(port, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    (function check() {
      const socket = net.connect(port, "127.0.0.1");
      socket.once("connect", () => {
        socket.end();
        resolve();
      });
      socket.once("error", () => {
        socket.destroy();
        if (Date.now() - start > timeout) {
          reject(new Error("timeout"));
        } else {
          setTimeout(check, 100);
        }
      });
    })();
  });
}

test("npm run serve starts on port 3000", async () => {
  const proc = spawn("npm", ["run", "serve"], {
    stdio: "ignore",
    detached: true,
  });
  await waitForPort(3000);
  process.kill(-proc.pid);
  await new Promise((r) => proc.on("exit", r));
  try {
    execSync('pkill -f "node scripts/dev-server.js"');
  } catch {
    /* ignore */
  }
  expect(true).toBe(true);
});
