const fs = require("fs");
const path = require("path");

function parseResults(data) {
  const runs = Array.isArray(data.runs) ? data.runs : [];
  return runs.flatMap((run) =>
    (run.results || []).map((res) => {
      const loc = res.locations && res.locations[0]?.physicalLocation;
      const severity =
        res.rule?.severity ||
        res.rule?.properties?.severity ||
        res.rule?.securitySeverityLevel ||
        res.properties?.severity ||
        "unknown";
      return {
        severity,
        line: loc?.region?.startLine,
        file: loc?.artifactLocation?.uri,
      };
    }),
  );
}

test("no high severity CodeQL alerts", () => {
  const file = path.join(__dirname, "__fixtures__", "codeql-results.json");
  const json = JSON.parse(fs.readFileSync(file, "utf8"));
  const alerts = parseResults(json);
  const high = alerts.filter((a) => a.severity.toLowerCase() === "high");
  expect(high).toEqual([]);
  expect(alerts).toEqual([
    { severity: "medium", line: 42, file: "src/app.js" },
    { severity: "low", line: 5, file: "src/util.js" },
  ]);
});
