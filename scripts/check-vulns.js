#!/usr/bin/env node
const { spawnSync } = require("child_process");

const proc = spawnSync("npm", ["audit", "--json", "--omit=dev"], {
  encoding: "utf8",
});
const output = proc.stdout || proc.stderr;
let report;
try {
  report = JSON.parse(output);
} catch (_err) {
  console.error("Failed to parse npm audit JSON");
  console.error(output);
  process.exit(1);
}
let vulns = report.metadata && report.metadata.vulnerabilities;
if (!vulns && report.vulnerabilities) {
  vulns = {};
  for (const v of Object.values(report.vulnerabilities)) {
    const severity = v.severity;
    if (severity) vulns[severity] = (vulns[severity] || 0) + 1;
  }
}
const high = (vulns && vulns.high) || 0;
const critical = (vulns && vulns.critical) || 0;
if (high > 0 || critical > 0) {
  console.error(
    `High/critical vulnerabilities detected: high=${high} critical=${critical}`,
  );
  process.exit(1);
}
process.exit(0);
