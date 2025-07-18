/* eslint-env node, browser */
const { spawn } = require("child_process");
const net = require("net");
const path = require("path");
const { chromium } = require("playwright");

jest.setTimeout(120000);

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

test("viewerReady dataset becomes true", async () => {
  const proc = spawn("npm", ["run", "serve"], {
    cwd: repoRoot,
    env: { ...process.env, PORT: "3000", SKIP_PW_DEPS: "1" },
    stdio: "ignore",
  });
  await waitPort(3000);
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto("https://localhost:3000/");
  await page.waitForFunction("document.body.dataset.viewerReady", {
    timeout: 60000,
  });
  const ready = await page.evaluate("document.body.dataset.viewerReady");
  expect(ready).toBeTruthy();
  await browser.close();
  await new Promise((resolve) => {
    proc.once("close", resolve);
    proc.kill("SIGTERM");
  });
});
