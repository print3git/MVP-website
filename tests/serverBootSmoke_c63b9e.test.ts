const { spawn } = require("child_process");
const path = require("path");
const waitOn = require("wait-on");

describe("backend server boot", () => {
  let proc;

  afterEach(() => {
    if (proc) proc.kill();
  });

  test("server starts on localhost:3000", async () => {
    expect(process.env.DB_URL).toBeDefined();
    expect(process.env.STRIPE_SECRET_KEY).toBeDefined();
    const serverPath = path.join(__dirname, "..", "backend", "server.js");
    proc = spawn(process.execPath, [serverPath], { stdio: "ignore" });
    try {
      await waitOn({
        resources: ["http://localhost:3000/healthz"],
        timeout: 5000,
      });
    } catch (err) {
      throw new Error(`Server failed to start: ${err.message}`);
    }
  });
});
