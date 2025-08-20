const fs = require("fs");
const path = require("path");

const ARTIFACTS_DIR = path.join(__dirname, "..", "..", ".artifacts");

async function snapshotHealthz() {
  const url = "http://localhost:3000/healthz";
  const result = { url };
  try {
    const res = await fetch(url);
    const body = await res.text();
    const headers = Object.fromEntries(res.headers.entries());
    console.log("healthz body:", body);
    console.log("healthz headers:", headers);
    Object.assign(result, { status: res.status, headers, body });
  } catch (err) {
    console.log("healthz fetch error:", err.message);
    result.error = err.message;
  }
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(ARTIFACTS_DIR, "healthz.json"),
    JSON.stringify(result, null, 2),
  );
}

test("healthz contract snapshot", async () => {
  await snapshotHealthz();
});
