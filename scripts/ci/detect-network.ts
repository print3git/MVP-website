import https from "https";
const url = process.env.NPM_REGISTRY_PING ?? "https://registry.npmjs.org/-/ping";
const req = https.get(url, { timeout: 4000 }, res => {
  // 200–403 means the host is reachable even if proxied/forbidden (we only care about reachability)
  const ok = res.statusCode && res.statusCode >= 200 && res.statusCode < 500;
  console.log(ok ? "ONLINE" : "OFFLINE");
  process.exit(ok ? 0 : 1);
});
req.on("error", () => { console.log("OFFLINE"); process.exit(1); });
req.setTimeout(4000, () => { req.destroy(new Error("timeout")); });
