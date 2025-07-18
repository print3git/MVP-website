const { spawnSync } = require("child_process");
const path = require("path");

test("backend server environment prerequisites", () => {
  const server = path.join(__dirname, "..", "..", "backend", "server.js");
  const res = spawnSync("node", [server], {
    env: { ...process.env, PORT: "3999" },
    encoding: "utf8",
    timeout: 3000,
  });

  const output = `${res.stdout || ""}${res.stderr || ""}`;
  if (/Missing required env/.test(output)) {
    console.log(output);
  }

  if (res.status !== null && res.status !== 0) {
    console.log(output);
    throw new Error(`Server exited with code ${res.status}`);
  }

  if (res.error && res.error.code === "ETIMEDOUT") {
    return; // server stayed up past timeout
  }

  if (res.status === 0 && output.trim() === "") {
    throw new Error("Server exited silently without logs");
  }
});
