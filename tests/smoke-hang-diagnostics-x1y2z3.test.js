describe.skip("insecure http fetch; https unavailable", () => {
  /* global document */
  const { spawn, spawnSync } = require("child_process");
  const net = require("net");
  const fetch = require("node-fetch");
  const { chromium } = require("playwright");

  function waitForPort(port, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      (function retry() {
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
            setTimeout(retry, 100);
          }
        });
      })();
    });
  }

  function startServer(port, useHttps = false) {
    const env = { ...process.env, PORT: String(port), SKIP_PW_DEPS: "1" };
    if (useHttps) {
      env.USE_HTTPS = "1";
    }
    const proc = spawn("npm", ["run", "serve"], { env, stdio: "ignore" });
    return { proc, port };
  }

  afterEach(() => {
    // ensure no stray servers
    try {
      spawnSync("pkill", ["-f", "dev-server.js"]);
    } catch {
      /* ignore */
    }
  });

  test("serve binds on port 3000", async () => {
    const { proc } = startServer(3000);
    await expect(waitForPort(3000)).resolves.toBeUndefined();
    proc.kill("SIGTERM");
  });

  test("homepage responds at root path", async () => {
    const { proc, port } = startServer(3100);
    await waitForPort(port);
    const res = await fetch(`http://localhost:${port}/`);
    expect(res.status).toBe(200);
    proc.kill("SIGTERM");
  });

  test("viewerReady marker appears", async () => {
    const { proc, port } = startServer(3200);
    await waitForPort(port);
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto(`http://localhost:${port}/`);
    await page.waitForFunction('document.body.dataset.viewerReady === "true"', {
      timeout: 30000,
    });
    const ready = await page.evaluate(() => document.body.dataset.viewerReady);
    expect(ready).toBe("true");
    await browser.close();
    proc.kill("SIGTERM");
  });

  test("static asset loads", async () => {
    const { proc, port } = startServer(3300);
    await waitForPort(port);
    const res = await fetch(`http://localhost:${port}/js/ModelViewer.js`);
    expect(res.status).toBe(200);
    proc.kill("SIGTERM");
  });

  test("static index.js loads over https", async () => {
    const { proc, port } = startServer(3301, true);
    await waitForPort(port);
    const res = await fetch(`https://localhost:${port}/js/index.js`);
    expect(res.status).toBe(200);
    proc.kill("SIGTERM");
  });

  test("viewer readiness under 30s", async () => {
    const { proc, port } = startServer(3400);
    const start = Date.now();
    await waitForPort(port);
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto(`http://localhost:${port}/`);
    await page.waitForFunction('document.body.dataset.viewerReady === "true"', {
      timeout: 30000,
    });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(30000);
    await browser.close();
    proc.kill("SIGTERM");
  });

  test("run-smoke fails fast with small timeout", () => {
    const result = spawnSync("node", ["scripts/run-smoke.js"], {
      env: {
        ...process.env,
        WAIT_ON_TIMEOUT: "1000",
        SKIP_SETUP: "1",
        SKIP_PW_DEPS: "1",
      },
      encoding: "utf8",
      timeout: 20000,
    });
    expect(result.status).not.toBe(0);
    expect(result.stdout + result.stderr).toMatch(/Environment keys:/);
  });

  test("no dev-server process after failure", () => {
    spawnSync("node", ["scripts/run-smoke.js"], {
      env: {
        ...process.env,
        WAIT_ON_TIMEOUT: "1000",
        SKIP_SETUP: "1",
        SKIP_PW_DEPS: "1",
      },
      timeout: 20000,
      stdio: "ignore",
    });
    const ps = spawnSync("pgrep", ["-f", "dev-server.js"], {
      encoding: "utf8",
    });
    expect(ps.stdout.trim()).toBe("");
  });

  test("run-smoke completes within one minute", () => {
    const start = Date.now();
    const result = spawnSync("node", ["scripts/run-smoke.js"], {
      env: {
        ...process.env,
        WAIT_ON_TIMEOUT: "5000",
        SKIP_SETUP: "1",
        SKIP_PW_DEPS: "1",
      },
      timeout: 60000,
      stdio: "ignore",
    });
    expect(Date.now() - start).toBeLessThan(60000);
    expect(result.status).not.toBe(null);
  });
});
