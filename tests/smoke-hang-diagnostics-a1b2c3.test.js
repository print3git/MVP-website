const { startDevServer } = require("../scripts/dev-server");
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
  test("npm run serve binds to port 3000", async () => {
    const server = startDevServer(3000);
    await waitPort(3000);
    server.close();
  });

  test("homepage responds at /", async () => {
    const server = startDevServer(0);
    const port = server.address().port;
    await waitPort(port);
    const res = await fetch(`http://127.0.0.1:${port}/`);
    server.close();
    expect(res.status).toBe(200);
  });

  test("viewerReady marker present", () => {
    const content = fs.readFileSync("js/index.js", "utf8");
    expect(content).toMatch(/viewerReady/);
  });

  test("static asset loads", async () => {
    const server = startDevServer(0);
    const port = server.address().port;
    await waitPort(port);
    const res = await fetch(`http://127.0.0.1:${port}/img/boxlogo.png`);
    server.close();
    expect(res.status).toBe(200);
  });

  test("readiness under 3s", async () => {
    const t = Date.now();
    const server = startDevServer(0);
    const port = server.address().port;
    await waitPort(port);
    server.close();
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
