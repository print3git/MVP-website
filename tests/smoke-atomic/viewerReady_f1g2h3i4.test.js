const { test, expect } = require("@playwright/test");
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
        if (Date.now() - start > timeout) reject(new Error("timeout"));
        else setTimeout(tryConnect, 100);
      });
    }
    tryConnect();
  });
}

test("viewerReady flag present on homepage", async ({ page }) => {
  const port = 3100 + Math.floor(Math.random() * 5000);
  const env = { ...process.env, PORT: String(port) };
  const proc = spawn("npm", ["run", "serve"], { env });
  await waitForPort(port);
  await page.goto(`http://localhost:${port}/`);
  await page.waitForFunction('document.body.dataset.viewerReady === "true"');
  const ready = await page.evaluate("document.body.dataset.viewerReady");
  expect(ready).toBe("true");
  proc.kill();
});
