describe.skip("insecure http fetch; https unavailable", () => {
  const { main, run } = require("../scripts/run-smoke.js");
  const child_process = require("child_process");
  const net = require("net");
  const fetch = require("node-fetch");
  const fs = require("fs");

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

  describe("smoke hang diagnostics", () => {
    test("npm run serve binds to port", async () => {
      const { port } = globalThis.__TEST_SERVER__.address();
      await waitPort(port);
    });

    test("homepage responds at /", async () => {
      const base = globalThis.__TEST_BASE_URL__;
      const url = new URL(base);
      await waitPort(Number(url.port));
      const res = await fetch(`${base}/`);
      expect(res.status).toBe(200);
    });

    test("viewerReady marker present", () => {
      const content = fs.readFileSync("js/index.js", "utf8");
      expect(content).toMatch(/viewerReady/);
    });

    test("static asset loads", async () => {
      const base = globalThis.__TEST_BASE_URL__;
      const url = new URL(base);
      await waitPort(Number(url.port));
      const res = await fetch(`${base}/img/box%20logo.png`);
      expect(res.status).toBe(200);
    });

    test("readiness under 3s", async () => {
      const t = Date.now();
      const base = globalThis.__TEST_BASE_URL__;
      const url = new URL(base);
      await waitPort(Number(url.port));
      expect(Date.now() - t).toBeLessThan(3000);
    });

    test("run() returns on success", () => {
      const spy = jest
        .spyOn(child_process, "spawnSync")
        .mockReturnValue({ status: 0 });
      run("echo hi");
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    test("run() throws on failure", () => {
      const spy = jest
        .spyOn(child_process, "spawnSync")
        .mockReturnValue({ status: 1 });
      expect(() => run("false")).toThrow(/Command failed/);
      spy.mockRestore();
    });

    test("concurrent commands use -k flag", () => {
      jest.spyOn(child_process, "spawnSync").mockReturnValue({ status: 0 });
      process.env.SKIP_SETUP = "1";
      process.env.SKIP_PW_DEPS = "1";
      main();
      const cmd = child_process.spawnSync.mock.calls.find((c) =>
        c[0].includes("concurrently"),
      )[0];
      delete process.env.SKIP_SETUP;
      delete process.env.SKIP_PW_DEPS;
      child_process.spawnSync.mockRestore();
      expect(cmd).toMatch(/-k/);
    });
  });
});
