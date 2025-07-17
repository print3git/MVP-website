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
      resources: ["http://localhost:3000/healthz"],
      timeout: 120000,
    });
    const res = await fetch("http://localhost:3000/healthz");
    if (!res.ok) {
      throw new Error(`Expected 200 from /healthz, got ${res.status}`);
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
