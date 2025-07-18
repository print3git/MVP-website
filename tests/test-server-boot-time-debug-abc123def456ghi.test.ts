import { spawn } from "child_process";
import path from "path";
import waitOn from "wait-on";
import { initEnv } from "../scripts/run-smoke";

describe("server boot time debug", () => {
  jest.setTimeout(20000);
  const repoRoot = path.resolve(__dirname, "..");
  const required = [
    "STRIPE_TEST_KEY",
    "CLOUDFRONT_MODEL_DOMAIN",
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
    "DB_URL",
    "STRIPE_SECRET_KEY",
  ];

  let proc;

  afterEach(async () => {
    if (proc) {
      proc.kill("SIGTERM");
      await new Promise((r) => proc.on("exit", r));
      proc = undefined;
    }
  });

  async function startServer(attempt) {
    const env = initEnv(process.env);
    for (const key of required) {
      expect(env[key]).toBeTruthy();
    }
    console.log(`Starting dev server (attempt ${attempt})`);
    const start = Date.now();
    proc = spawn("npm", ["run", "serve"], {
      cwd: repoRoot,
      env: { ...env, PORT: "3000", SKIP_PW_DEPS: "1" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stderr = "";
    if (proc.stderr) proc.stderr.on("data", (d) => (stderr += d.toString()));
    try {
      await waitOn({
        resources: ["http://localhost:3000/healthz"],
        timeout: 10000,
      });
      console.log(`Dev server booted in ${Date.now() - start}ms`);
      return stderr;
    } catch (err) {
      console.log(`Dev server failed after ${Date.now() - start}ms: ${err}`);
      proc.kill("SIGTERM");
      await new Promise((r) => proc.on("exit", r));
      proc = undefined;
      if (attempt < 2) {
        return startServer(attempt + 1);
      }
      throw new Error(stderr || String(err));
    }
  }

  test("boots with required env vars", async () => {
    const stderr = await startServer(1);
    if (stderr) console.log(`Server stderr:\n${stderr}`);
  });
});
