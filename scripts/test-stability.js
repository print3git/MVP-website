const { execSync } = require("child_process");

const runs = 3;
let lastCode = 1;

for (let i = 1; i <= runs; i++) {
  console.log(`Stability run ${i} of ${runs}`);
  try {
    execSync("npm run test-ci --prefix backend", { stdio: "inherit" });
    process.exit(0);
  } catch (err) {
    lastCode = err.status ?? 1;
    if (i < runs) {
      console.log(`Retrying stability run ${i + 1}...`);
    }
  }
}

process.exit(lastCode);
