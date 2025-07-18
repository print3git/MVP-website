const { spawn } = require("child_process");

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

test("root endpoint responds with 200", async () => {
  const proc = spawn("npm", ["run", "serve"], { env: process.env });
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch("https://localhost:3000/");
      if (res.status === 200) {
        proc.kill();
        return;
      }
    } catch {
      /* empty */
    }
    await wait(100);
  }
  proc.kill();
  throw new Error("server did not respond");
});
