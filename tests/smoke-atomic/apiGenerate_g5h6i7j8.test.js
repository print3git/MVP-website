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

test("api /api/generate returns json", async () => {
  const port = 3200 + Math.floor(Math.random() * 5000);
  const env = { ...process.env, PORT: String(port) };
  const proc = spawn("npm", ["run", "serve"], { env });
  await waitForPort(port);
  const res = await fetch(`https://localhost:${port}/api/generate`, {
    method: "POST",
  });
  const body = await res.json();
  expect(res.status).toBe(200);
  expect(body).toHaveProperty("glb_url");
  proc.kill();
});
