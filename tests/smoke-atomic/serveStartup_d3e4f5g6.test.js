const { spawn } = require("child_process");
const net = require("net");

function waitForPort(port, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    function tryConnect() {
      const socket = net.connect(port, "127.0.0.1");
      socket.on("connect", () => {
        socket.end();
        resolve();
      });
      socket.on("error", () => {
        socket.destroy();
        if (Date.now() - start > timeout) {
          reject(new Error("timeout"));
        } else {
          setTimeout(tryConnect, 100);
        }
      });
    }
    tryConnect();
  });
}

test("npm run serve starts server on port 3000", async () => {
  const proc = spawn("npm", ["run", "serve"], { env: process.env });
  await waitForPort(3000);
  proc.kill();
});
