const fs = require("fs");
const { spawn } = require("child_process");

const file = "coverage/lcov.info";
if (!fs.existsSync(file)) {
  console.error(`Missing ${file}`);
  process.exit(1);
}
const lcov = fs.readFileSync(file, "utf8");

const delays = [5000, 10000, 20000, 40000, 60000];

async function upload(attempt = 0) {
  return new Promise((resolve) => {
    const child = spawn("npx", ["coveralls"], {
      stdio: ["pipe", "inherit", "pipe"],
    });
    let stderr = "";
    child.stderr.on("data", (d) => {
      const t = d.toString();
      stderr += t;
      process.stderr.write(t);
    });
    child.on("close", async (code) => {
      if (code === 0) return resolve(true);
      if (/5(03|04)/.test(stderr) && attempt < delays.length) {
        const wait = delays[attempt];
        console.warn(`Coveralls HTTP error; retrying in ${wait / 1000}s`);
        setTimeout(() => resolve(upload(attempt + 1)), wait);
      } else if (/5(03|04)/.test(stderr)) {
        console.warn("Coveralls HTTP error; giving up after retries");
        resolve(false);
      } else {
        process.exit(code || 1);
      }
    });
    child.stdin.write(lcov);
    child.stdin.end();
  });
}

upload().then((success) => {
  if (!success) console.warn("Coveralls unavailable; continuing");
  process.exit(0);
});
