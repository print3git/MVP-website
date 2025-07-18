const child_process = require("child_process");
const { spawn } = child_process;
const net = require("net");
const fetch = require("node-fetch");
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

jest.setTimeout(20000);

function waitForPort(port, timeout = 10000) {
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

function startServer(env = {}) {
  return spawn("npm", ["run", "serve"], { env: { ...process.env, ...env } });
}

async function stop(proc) {
  if (proc) proc.kill();
  await new Promise((r) => setTimeout(r, 100));
}

test("serve binds to port 3000", async () => {
  const proc = startServer();
  await waitForPort(3000);
  await stop(proc);
});

test("homepage responds at root", async () => {
  const proc = startServer();
  await waitForPort(3000);
  const res = await fetch("http://localhost:3000/");
  await stop(proc);
  expect(res.status).toBe(200);
});

test("viewerReady script present", () => {
  const content = fs.readFileSync(path.join("js", "index.js"), "utf8");
  expect(content).toMatch(/dataset\.viewerReady/);
});

test("static index.js loads", async () => {
  const proc = startServer({ USE_HTTPS: "1" });
  await waitForPort(3000);
  const res = await fetch("https://localhost:3000/js/index.js");
  await stop(proc);
  expect(res.status).toBe(200);
});

test("viewerReady within 10s", async () => {
  const proc = startServer();
  await waitForPort(3000);
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const start = Date.now();
  await page.goto("http://localhost:3000/");
  await page.waitForFunction("document.body.dataset.viewerReady", {
    timeout: 10000,
  });
  const elapsed = Date.now() - start;
  await browser.close();
  await stop(proc);
  expect(elapsed).toBeLessThan(10000);
});

test("run-smoke uses WAIT_ON_TIMEOUT", () => {
  const spy = jest
    .spyOn(require("child_process"), "spawnSync")
    .mockReturnValue({ status: 0 });
  process.env.WAIT_ON_TIMEOUT = "5000";
  process.env.SKIP_SETUP = "1";
  process.env.SKIP_PW_DEPS = "1";
  jest.isolateModules(() => {
    require("../scripts/run-smoke.js").main();
  });
  const cmd = spy.mock.calls.find((c) => c[0].includes("concurrently"))[0];
  spy.mockRestore();
  delete process.env.WAIT_ON_TIMEOUT;
  delete process.env.SKIP_SETUP;
  delete process.env.SKIP_PW_DEPS;
  expect(cmd).toMatch(/wait-on -t 5000 http:\/\/localhost:3000/);
});

test("run helper returns synchronously", () => {
  const spy = jest
    .spyOn(child_process, "spawnSync")
    .mockReturnValue({ status: 0 });
  const { run } = require("../scripts/run-smoke.js");
  run("echo hi");
  expect(spy).toHaveBeenCalled();
  spy.mockRestore();
});

test("run throws on non-zero exit", () => {
  const spy = jest
    .spyOn(child_process, "spawnSync")
    .mockReturnValue({ status: 1 });
  const { run } = require("../scripts/run-smoke.js");
  expect(() => run("bad")).toThrow();
  spy.mockRestore();
});
