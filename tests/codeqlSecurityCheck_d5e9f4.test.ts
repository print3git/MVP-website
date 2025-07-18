const fs = require("fs");
const path = require("path");

function severityOf(result) {
  return (
    (result.properties && result.properties.severity) ||
    (result.rule &&
      result.rule.properties &&
      result.rule.properties.securitySeverityLevel) ||
    (result.rule &&
      result.rule.properties &&
      result.rule.properties.severity) ||
    (result.rule &&
      result.rule.defaultConfiguration &&
      result.rule.defaultConfiguration.level) ||
    result.level ||
    ""
  )
    .toString()
    .toLowerCase();
}

describe("codeql security output", () => {
  const logFile =
    process.env.CODEQL_OUTPUT ||
    process.env.CODEQL_LOG ||
    process.env.CODEQL_ANNOTATIONS ||
    path.join(__dirname, "..", "codeql-results.sarif");

  const run = fs.existsSync(logFile) ? test : test.skip;

  run("no high severity alerts", () => {
    const data = JSON.parse(fs.readFileSync(logFile, "utf8"));
    const alerts = [];
    for (const run of data.runs || []) {
      for (const res of run.results || []) {
        const sev = severityOf(res);
        const numeric = parseFloat(sev);
        const high =
          sev === "high" ||
          sev === "critical" ||
          sev === "error" ||
          (!Number.isNaN(numeric) && numeric >= 8);
        if (high) {
          const line =
            res.locations &&
            res.locations[0] &&
            res.locations[0].physicalLocation &&
            res.locations[0].physicalLocation.region &&
            res.locations[0].physicalLocation.region.startLine;
          const msg =
            (res.message && (res.message.text || res.message.message)) ||
            "issue";
          alerts.push(msg + (line ? " on line " + line : ""));
        }
      }
    }
    if (alerts.length) {
      throw new Error("High severity CodeQL alerts:\n" + alerts.join("\n"));
    }
  });
});
