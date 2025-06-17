require('dotenv').config();
const fs = require('fs');
const path = require('path');
const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');

async function measure(url = 'http://localhost:3000/') {
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
  try {
    const options = { port: chrome.port, output: 'json', logLevel: 'error' };
    const result = await lighthouse(url, options);
    const reportDir = path.join(__dirname, '..', '..', 'reports');
    fs.mkdirSync(reportDir, { recursive: true });
    const outFile = path.join(reportDir, 'lighthouse.json');
    fs.writeFileSync(outFile, result.report);
    console.log('Performance score', result.lhr.categories.performance.score);
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
