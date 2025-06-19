const { execSync } = require("child_process");

const runs = 3;
for (let i = 1; i <= runs; i++) {
  console.log(`Stability run ${i} of ${runs}`);
  try {
    execSync("npm run test-ci --prefix backend", { stdio: "inherit" });
  } catch (err) {
    console.error(`Test run ${i} failed`);
    process.exit(1);
  }
}
console.log("All stability runs passed");
