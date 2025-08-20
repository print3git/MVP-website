const { spawn } = require("child_process");
const waitOn = require("wait-on");

async function main() {
  const server = spawn("npm", ["run", "serve"], {
    stdio: "inherit",
    shell: true,
  });
  let exited = false;
  server.on("exit", () => {
    exited = true;
  });
  try {
    await waitOn({
      resources: [
        "http://localhost:3000/healthz",
        "http://localhost:3000/readyz",
      ],
      timeout: 120000,
    });
    const health = await fetch("http://localhost:3000/healthz");
    if (!health.ok) {
      throw new Error(`Expected 200 from /healthz, got ${health.status}`);
    }
    const ready = await fetch("http://localhost:3000/readyz");
    if (!ready.ok) {
      throw new Error(`Expected 200 from /readyz, got ${ready.status}`);
    }
    console.log("Server responded within timeout");
  } catch (err) {
    console.error("Frontend failed to become ready within 2 minutes");
    console.error(err.message || err);
    server.kill("SIGTERM");
    process.exit(1);
  }
  server.kill("SIGTERM");
  if (!exited) {
    await new Promise((resolve) => server.on("exit", resolve));
  }
}

if (require.main === module) {
  main();
}
