import { execSync } from "child_process";

export function isOfflineEnv({
  retries = Number(process.env.NET_MODE_RETRIES || 2),
  timeout = Number(process.env.NET_MODE_TIMEOUT || 10000),
} = {}) {
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
    const maxTime = Math.ceil(timeout / 1000);
    withRetries(
      `curl -sfI --max-time ${maxTime} https://registry.npmjs.org/-/ping`,
      { retries, timeout },
    );
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
