describe.skip("insecure http fetch; https unavailable", () => {
  const { spawn } = require("child_process");
  const net = require("net");
  const fetch = require("node-fetch");
  const fs = require("fs");
  const path = require("path");

  const repoRoot = path.resolve(__dirname, "..");

  function waitPort(port, timeout = 10000) {
    const start = Date.now();
    return new Promise((resolve, reject) => {
      (function check() {
        const socket = net.connect(port, "127.0.0.1");
        socket.once("connect", () => {
          socket.end();
          resolve();
        });
        socket.once("error", () => {
          socket.destroy();
          if (Date.now() - start > timeout) return reject(new Error("timeout"));
          setTimeout(check, 100);
        });
      })();
    });
  }

  function startServer() {
    const proc = spawn("npm", ["run", "serve"], {
      cwd: repoRoot,
      env: { ...process.env, PORT: "3000", SKIP_PW_DEPS: "1" },
      stdio: "ignore",
    });
    return proc;
  }

  describe("smoke hang diagnostics", () => {
    test("npm run serve binds to port 3000", async () => {
      const proc = startServer();
      await expect(waitPort(3000, 5000)).resolves.toBeUndefined();
      proc.kill("SIGTERM");
    });

    test("homepage responds at /", async () => {
      const proc = startServer();
      await waitPort(3000);
      const res = await fetch("http://localhost:3000/");
      proc.kill("SIGTERM");
      expect(res.status).toBe(200);
    });

    test("viewerReady marker present in page", async () => {
      const proc = startServer();
      await waitPort(3000);
      const html = await (
        await fetch("http://localhost:3000/index.html")
      ).text();
      proc.kill("SIGTERM");
      expect(html).toMatch(/viewerReady/);
    });

    test("static asset js/index.js loads", async () => {
      const proc = startServer();
      await waitPort(3000);
      const res = await fetch("http://localhost:3000/js/index.js");
      proc.kill("SIGTERM");
      expect(res.status).toBe(200);
    });

    test("healthz responds within 1s", async () => {
      const proc = startServer();
      await waitPort(3000);
      const start = Date.now();
      const res = await fetch("http://localhost:3000/healthz");
      const duration = Date.now() - start;
      proc.kill("SIGTERM");
      expect(res.status).toBe(200);
      expect(duration).toBeLessThan(1000);
    });

    test("run-smoke exits on wait-on timeout", () =>
      new Promise((resolve, reject) => {
        const proc = spawn("node", ["scripts/run-smoke.js"], {
          cwd: repoRoot,
          env: {
            ...process.env,
            WAIT_ON_TIMEOUT: "1000",
            SKIP_SETUP: "1",
            SKIP_PW_DEPS: "1",
            PORT: "3999",
          },
          stdio: "ignore",
        });
        const timer = setTimeout(() => {
          proc.kill("SIGTERM");
          reject(new Error("run-smoke.js hung"));
        }, 15000);
        proc.on("exit", (code) => {
          clearTimeout(timer);
          expect(code).not.toBe(0);
          resolve();
        });
      }));

    test("run-smoke cleans up dev server", async () => {
      await new Promise((resolve) => {
        const proc = spawn("node", ["scripts/run-smoke.js"], {
          cwd: repoRoot,
          env: {
            ...process.env,
            WAIT_ON_TIMEOUT: "1000",
            SKIP_SETUP: "1",
            SKIP_PW_DEPS: "1",
            PORT: "3998",
          },
          stdio: "ignore",
        });
        proc.on("exit", resolve);
      });
      const check = spawn("pgrep", ["-f", "dev-server.js"]);
      let output = "";
      check.stdout.on("data", (d) => (output += d));
      await new Promise((r) => check.on("exit", r));
      expect(output.trim()).toBe("");
    });

    test("concurrently command uses -k to kill others", () => {
      const content = fs.readFileSync(
        path.join(repoRoot, "scripts", "run-smoke.js"),
        "utf8",
      );
      expect(content).toMatch(/concurrently[^\n]+-k/);
    });
  });
});
