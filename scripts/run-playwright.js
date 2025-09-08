#!/usr/bin/env node
const { spawn, spawnSync } = require("child_process");
const waitOn = require("wait-on");

let server;

async function stopServer() {
  if (server && !server.killed) {
    const proc = server;
    server = null;
    proc.kill();
    await new Promise((resolve) => proc.once("exit", resolve));
  } else {
    server = null;
  }
}

async function run() {
  server = spawn("npx", ["http-server", ".", "-p", "3000"], {
    stdio: "ignore",
  });

  try {
    await waitOn({ resources: ["http://localhost:3000"], timeout: 30000 });
    const res = spawnSync(
      "npx",
      ["playwright", "test", ...process.argv.slice(2)],
      { stdio: "inherit" },
    );
    await stopServer();
    process.exit(res.status ?? 1);
  } catch (err) {
    await stopServer();
    throw err;
  }
}

for (const sig of ["SIGINT", "SIGTERM", "exit"]) {
  process.on(sig, () => {
    if (server && !server.killed) server.kill();
  });
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
