const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function runAudit() {
  try {
    return execFileSync("npm", ["audit", "--json"], { encoding: "utf8" });
  } catch (_err) {
    // npm audit exits with code 1 when vulnerabilities are found
    return _err.stdout;
  }
}

function getVersionFromNodes(nodes) {
  if (!Array.isArray(nodes) || nodes.length === 0) return "unknown";
  const pkgPath = path.join(nodes[0], "package.json");
  try {
    return JSON.parse(fs.readFileSync(pkgPath, "utf8")).version || "unknown";
  } catch {
    return "unknown";
  }
}

function parseV2(data) {
  const rows = [];
  for (const [name, info] of Object.entries(data.vulnerabilities || {})) {
    const vias = Array.isArray(info.via) ? info.via : [];
    for (const via of vias) {
      if (
        typeof via === "object" &&
        (via.severity === "high" || via.severity === "critical")
      ) {
        rows.push({
          name,
          version: getVersionFromNodes(info.nodes),
          severity: via.severity,
          title: via.title || "",
          paths: Array.isArray(info.nodes) ? info.nodes.length : 0,
        });
      }
    }
  }
  return rows;
}

function parseV1(data) {
  const rows = [];
  for (const adv of Object.values(data.advisories || {})) {
    if (adv.severity === "high" || adv.severity === "critical") {
      const finding = adv.findings && adv.findings[0];
      const paths =
        finding && Array.isArray(finding.paths) ? finding.paths.length : 0;
      rows.push({
        name: adv.module_name,
        version: finding && finding.version ? finding.version : "unknown",
        severity: adv.severity,
        title: adv.title,
        paths,
      });
    }
  }
  return rows;
}

function main() {
  const output = runAudit();
  let data;
  try {
    data = JSON.parse(output);
  } catch (_err) {
    console.error("Failed to parse npm audit output");
    process.exit(1);
  }

  const rows = data.advisories ? parseV1(data) : parseV2(data);

  if (rows.length === 0) {
    console.log("No high or critical vulnerabilities");
    return;
  }

  console.log("| Module | Version | Severity | Title | Paths |");
  console.log("| --- | --- | --- | --- | --- |");
  for (const r of rows) {
    console.log(
      `| ${r.name} | ${r.version} | ${r.severity} | ${r.title} | ${r.paths} |`,
    );
  }
  process.exitCode = 1;
}

main();
