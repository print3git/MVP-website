#!/usr/bin/env node
const path = require("path");
const { spawn, spawnSync } = require("child_process");
const waitOn = require("wait-on");

let staticServer;
let backendServer;

async function stopServers() {
  const toStop = [staticServer, backendServer];
  staticServer = null;
  backendServer = null;
  await Promise.all(
    toStop.map(
      (srv) =>
        new Promise((resolve) => {
          if (srv && !srv.killed) {
            srv.kill();
            srv.once("exit", resolve);
          } else {
            resolve();
          }
        }),
    ),
  );
}

async function run() {
  const repoRoot = path.resolve(__dirname, "..");
  const backendRoot = path.join(repoRoot, "backend");
  const staticPort = 3000;
  const backendPort = 3001;

  backendServer = spawn("npm", ["start"], {
    cwd: backendRoot,
    env: { ...process.env, PORT: String(backendPort) },
    stdio: "ignore",
  });
  staticServer = spawn("npx", ["http-server", repoRoot, "-p", String(staticPort)], {
    stdio: "ignore",
  });

  try {
    await waitOn({
      resources: [
        `http://localhost:${staticPort}/index.html`,
        `http://localhost:${backendPort}/healthz`,
      ],
      timeout: 30000,
    });
    const res = spawnSync(
      "npx",
      ["playwright", "test", ...process.argv.slice(2)],
      {
        stdio: "inherit",
        env: {
          ...process.env,
          PLAYWRIGHT_BASE_URL: `http://localhost:${backendPort}`,
          STATIC_SERVER_URL: `http://localhost:${staticPort}`,
        },
      },
    );
    await stopServers();
    process.exit(res.status ?? 1);
  } catch (err) {
    await stopServers();
    throw err;
  }
}

for (const sig of ["SIGINT", "SIGTERM", "exit"]) {
  process.on(sig, () => {
    for (const srv of [staticServer, backendServer]) {
      if (srv && !srv.killed) srv.kill();
    }
  });
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
