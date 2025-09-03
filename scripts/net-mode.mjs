import { execSync } from "child_process";

export function isOfflineEnv() {
  if (process.env.SKIP_NET_CHECKS === "1" || process.env.CI_NO_NET === "1") {
    setOfflineEnv();
    return true;
  }
  const proxyEnv =
    process.env.http_proxy ||
    process.env.https_proxy ||
    process.env.HTTP_PROXY ||
    process.env.HTTPS_PROXY;
  const sandbox = process.env.CI_SANDBOX === "1";
  if (sandbox) {
    setOfflineEnv();
    return true;
  }
  if (proxyEnv) {
    try {
      // Silence curl output; only the exit code matters for connectivity checks
      execSync(
        "curl -sfI --max-time 10 https://registry.npmjs.org/-/ping >/dev/null 2>&1",
        { stdio: "ignore" },
      );
    } catch {
      setOfflineEnv();
      return true;
    }
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
