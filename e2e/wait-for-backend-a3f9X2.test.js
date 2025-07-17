const { spawn } = require("child_process");
const waitOn = require("wait-on");

jest.setTimeout(180000); // allow up to 3 minutes for setup and teardown

test("frontend becomes ready within 2 minutes", async () => {
  const proc = spawn("npm", ["run", "serve"], {
    env: { ...process.env, PORT: "3000" },
    stdio: "inherit",
  });

  let succeeded = false;
  try {
    await waitOn({
      resources: ["http://localhost:3000"],
      timeout: 2 * 60 * 1000,
    });
    succeeded = true;
  } finally {
    proc.kill("SIGTERM");
  }

  if (!succeeded) {
    throw new Error("Frontend never became ready within 2 minutes");
  }
});
