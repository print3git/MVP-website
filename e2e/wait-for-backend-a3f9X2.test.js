const { spawn } = require("child_process");
const waitOn = require("wait-on");

if (require.main === module) {
  console.error(
    'This file is a Jest test. Run it with "npm test e2e/wait-for-backend-a3f9X2.test.js".',
  );
  process.exit(1);
}

jest.setTimeout(180000); // allow up to 3 minutes for the test

test("frontend becomes ready within 2 minutes", async () => {
  const server = spawn("npm", ["run", "serve"], {
    stdio: "inherit",
    shell: true,
  });
  let error;
  try {
    await waitOn({ resources: ["http://localhost:3000"], timeout: 120000 });
  } catch (err) {
    error = err;
  } finally {
    server.kill("SIGTERM");
  }
  if (error) {
    throw new Error("Frontend failed to start within 2 minutes");
  }
});
