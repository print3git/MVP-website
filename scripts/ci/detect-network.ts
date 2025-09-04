declare function require(name: string): any;

const https = require("https");
const url =
  (globalThis as any).process?.env.NPM_REGISTRY_PING ??
  "https://registry.npmjs.org/-/ping";

const req = https.get(url, { timeout: 4000 }, (res: any) => {
  const ok = res.statusCode && res.statusCode >= 200 && res.statusCode < 500;
  console.log(ok ? "ONLINE" : "OFFLINE");
  (globalThis as any).process?.exit(ok ? 0 : 1);
});
req.on("error", () => {
  console.log("OFFLINE");
  (globalThis as any).process?.exit(1);
});
req.setTimeout(4000, () => {
  req.destroy(new Error("timeout"));
});
