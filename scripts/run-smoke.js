#!/usr/bin/env node
const { execSync, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { loadEnv } = require("../test/envLoader");

function freePort(port, envVars = process.env) {
  try {
    execSync(`npx -y kill-port ${port}`, { stdio: "inherit", env: envVars });
  } catch (err) {
    console.warn(`kill-port ${port} failed`, err.message);
  }
}

function initEnv(baseEnv = process.env) {
  const env = { ...baseEnv };
  delete env.npm_config_http_proxy;
  delete env.npm_config_https_proxy;

  function loadEnvFile(file) {
    if (!fs.existsSync(file)) return;
    const content = fs.readFileSync(file, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) {
        const [, key, val] = m;
        if (!env[key]) {
          env[key] = val.replace(/^['"]|['"]$/g, "");
        }
      }
    }
  }

  if (fs.existsSync(path.join(process.cwd(), ".env"))) {
    loadEnvFile(path.join(process.cwd(), ".env"));
  } else if (fs.existsSync(path.join(process.cwd(), ".env.example"))) {
    loadEnvFile(path.join(process.cwd(), ".env.example"));
  }

  loadEnv(env);
  return env;
}

const env = initEnv(process.env);

console.log("DB_URL:", env.DB_URL);
console.log("CLOUDFRONT_MODEL_DOMAIN:", env.CLOUDFRONT_MODEL_DOMAIN);
console.log("STRIPE_SECRET_KEY:", env.STRIPE_SECRET_KEY);
console.log("SKIP_PW_DEPS:", env.SKIP_PW_DEPS);

// Skip Playwright dependency installation when the setup flag exists.
// This prevents repeated apt-get runs in CI environments.
if (
  !env.SKIP_PW_DEPS &&
  fs.existsSync(path.join(process.cwd(), ".setup-complete"))
) {
  env.SKIP_PW_DEPS = "1";
}

let lastCommand = "";

function runValidateEnv() {
  lastCommand = "npm run validate-env";
  const result = spawnSync(lastCommand, {
    shell: true,
    env,
    encoding: "utf8",
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) {
    const output = `${result.stdout || ""}${result.stderr || ""}`;
    const missing = [];
    for (const line of output.split(/\r?\n/)) {
      const m = line.match(/([A-Z_]+).*must be set/);
      if (m) missing.push(m[1]);
    }
    if (missing.length) {
      console.error("Missing required env vars:", missing.join(", "));
    }
    const err = new Error(`Command failed: ${lastCommand}`);
    err.status = result.status;
    throw err;
  }
}

function run(cmd) {
  lastCommand = cmd;
  console.log(`Running: ${cmd}`);
  const result = spawnSync(cmd, { stdio: "inherit", shell: true, env });
  console.log(`Exit code for '${cmd}':`, result.status);
  if (result.status !== 0) {
    const err = new Error(`Command failed: ${cmd}`);
    err.status = result.status;
    throw err;
  }
}

function dumpDiagnostics(err) {
  console.error("Smoke test failed:");
  console.error(err.stack || err.message);
  if (typeof err.status !== "undefined") {
    console.error("Exit code:", err.status);
  }
  console.error("Environment keys:", Object.keys(env).join(", "));
  if (lastCommand) {
    console.error("Command:", lastCommand);
  }
  console.error(
    "Ensure required environment variables are set and run 'npm run setup' manually.",
  );
}

function main() {
  try {
    runValidateEnv();
    if (!process.env.SKIP_SETUP && !fs.existsSync(".setup-complete")) {
      run("bash scripts/setup-codex-9b08f7c1.sh");
    } else {
      console.log("Skipping setup step");
    }
    try {
      execSync('pkill -f "node scripts/dev-server.js"', { stdio: "ignore" });
    } catch {
      // ignore if no server is running
    }
    freePort(process.env.PORT || 3000, env);
    if (!process.env.SKIP_PW_DEPS) {
      run("npx -y playwright install --with-deps");
    }
    const waitArgs = process.env.WAIT_ON_TIMEOUT
      ? `-t ${process.env.WAIT_ON_TIMEOUT} `
      : "";
    console.log("WAIT_ON_TIMEOUT:", process.env.WAIT_ON_TIMEOUT || "default");
    const serve = "npm run serve | tee serve.log";
    const test = `npx -y wait-on ${waitArgs}http://localhost:3000 && npx playwright test --reporter=list --trace on e2e/smoke.test.js | tee pw.log`;
    const cmd = `npx -y concurrently -k -s first --verbose -n serve,pw "${serve}" "${test}"`;
    try {
      run(cmd);
    } catch (_err) {
      console.warn("Server failed to start, retrying once...");
      freePort(process.env.PORT || 3000, env);
      run(cmd);
    }
  } catch (err) {
    dumpDiagnostics(err);
    process.exit(err.status ?? 1);
  }
}

process.on("uncaughtException", dumpDiagnostics);
process.on("unhandledRejection", dumpDiagnostics);

if (require.main === module) {
  main();
}

module.exports = { main, env, run, initEnv, freePort };
