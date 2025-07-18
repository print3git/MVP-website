/* global document */
/* eslint-env browser */
const { chromium } = require("playwright");
const { spawn } = require("child_process");
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
        if (Date.now() - start > timeout) reject(new Error("timeout"));
        else setTimeout(check, 100);
      });
    })();
  });
}

test.skip("viewer ready on /", async () => {
  const proc = spawn("node", ["scripts/dev-server.js"], { stdio: "ignore" });
  await waitForPort(3000);
  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    await page.goto("https://localhost:3000/");
    await page.waitForFunction(
      () => document.body.dataset.viewerReady === "true",
      { timeout: 15000 },
    );
    const ready = await page.evaluate(() => document.body.dataset.viewerReady);
    expect(ready).toBe("true");
  } finally {
    await browser.close();
    proc.kill();
  }
});
