require("dotenv").config();
const fs = require("fs");
const path = require("path");
const lighthouse = require("lighthouse");
const chromeLauncher = require("chrome-launcher");

async function measure(url = "http://localhost:3000/") {
  const chrome = await chromeLauncher.launch({ chromeFlags: ["--headless"] });
  try {
    const options = { port: chrome.port, output: "json", logLevel: "error" };
    const result = await lighthouse(url, options);
    const reportDir = path.join(__dirname, "..", "..", "reports");
    fs.mkdirSync(reportDir, { recursive: true });
    const outFile = path.join(reportDir, "lighthouse.json");
    fs.writeFileSync(outFile, result.report);
    const score = result.lhr.categories.performance.score;
    const metricsFile = path.join(reportDir, "load-metrics.csv");
    if (!fs.existsSync(metricsFile)) {
      fs.writeFileSync(metricsFile, "timestamp,score\n");
    }
    fs.appendFileSync(metricsFile, `${new Date().toISOString()},${score}\n`);
    console.log("Performance score", score);
  } finally {
    await chrome.kill();
  }
}

if (require.main === module) {
  measure().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = measure;
