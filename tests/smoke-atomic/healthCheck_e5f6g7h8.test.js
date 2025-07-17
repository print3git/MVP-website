const fetch = require("node-fetch");
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

describe("health check", () => {
  let proc;
  beforeAll(async () => {
    proc = spawn("node", ["scripts/dev-server.js"], { stdio: "ignore" });
    await waitForPort(3000);
  });
  afterAll(() => {
    proc.kill();
  });

  test("GET / responds within 5s", async () => {
    const res = await fetch("http://localhost:3000/");
    expect(res.status).toBe(200);
  });
});
