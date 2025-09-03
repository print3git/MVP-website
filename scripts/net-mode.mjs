import { execSync } from "child_process";

export function isOfflineEnv() {
  const force = process.env.CI_FORCE === "1";
  if (process.env.SKIP_NET_CHECKS === "1" || process.env.CI_NO_NET === "1") {
    setOfflineEnv();
    return !force;
  }
  const sandbox = process.env.CI_SANDBOX === "1";
  if (sandbox) {
    setOfflineEnv();
    return !force;
  }
  try {
    // Fetch headers and inspect the HTTP status code so 4xx responses still
    // trigger offline mode. Some environments return 403 yet exit with status 0
    // which would previously be treated as online.
    const res = execSync(
      "curl -sI --max-time 10 https://registry.npmjs.org/-/ping",
      { encoding: "utf8" },
    );
    if (!/^HTTP\/\d\.\d 2\d\d/.test(res)) throw new Error("bad status");
  } catch {
    setOfflineEnv();
    return !force;
  }
  return false;
}

export function logOfflineSkip(step) {
  console.log(`offline mode: skipping ${step}`);
}

export function withRetries(cmd, { retries = 3, timeout = 10000 } = {}) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      execSync(cmd, { stdio: "inherit", timeout });
      return;
    } catch (err) {
      if (attempt === retries) throw err;
      const msg = err && err.message ? err.message.trim() : "";
      console.warn(
        `retry ${attempt}/${retries} for '${cmd}'${msg ? `: ${msg}` : ""}`,
      );
    }
  }
}

function setOfflineEnv() {
  process.env.NPM_CONFIG_FUND = "false";
  process.env.NPM_CONFIG_AUDIT = "false";
  process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1";
  process.env.NPM_CONFIG_PREFER_OFFLINE = "true";
  process.env.npm_config_prefer_offline = "true";
}
