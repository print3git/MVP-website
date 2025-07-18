#!/usr/bin/env node
const fs = require("fs");
if (process.argv.length < 3) {
  console.error("Usage: sanitize-sarif.js <file>");
  process.exit(1);
}
const file = process.argv[2];
let data;
try {
  data = JSON.parse(fs.readFileSync(file, "utf8"));
} catch (err) {
  console.error("Failed to read SARIF file", err);
  process.exit(1);
}
if (!Array.isArray(data.runs)) data.runs = [];
for (const run of data.runs) {
  if (run.tool && run.tool.driver) {
    const name = run.tool.driver.name;
    if (!name || typeof name !== "string") {
      delete run.tool.driver.name;
    }
  }
  if (Array.isArray(run.results)) {
    run.results = run.results.map((r) => {
      if (Array.isArray(r.locations)) {
        r.locations = r.locations.filter((loc) => {
          const phys = loc && loc.physicalLocation;
          const art = phys && phys.artifactLocation;
          return phys && art && art.uri && typeof art.uri === "string";
        });
        if (r.locations.length === 0) delete r.locations;
      }
      if (r.suppressions === null) delete r.suppressions;
      return r;
    });
  }
}
fs.writeFileSync(file, JSON.stringify(data, null, 2));
