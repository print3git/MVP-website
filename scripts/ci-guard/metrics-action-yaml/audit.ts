const fs = require("fs");
const path = require("path");
const yaml = require("yaml");

function audit(file) {
  const abs = path.resolve(file);
  if (!fs.existsSync(abs)) {
    throw new Error(`File not found: ${abs}`);
  }
  const raw = fs.readFileSync(abs, "utf8");
  const lines = raw.split("\n");
  lines.forEach((line, idx) => {
    if (line.includes("\t")) {
      throw new Error(`${abs}:${idx + 1} Tabs detected`);
    }
    if (line.includes("\r")) {
      throw new Error(`${abs}:${idx + 1} CRLF line endings detected`);
    }
    const m = line.match(/^( +)\S/);
    if (m && m[1].length % 2 !== 0) {
      throw new Error(`${abs}:${idx + 1} Invalid indentation`);
    }
  });
  const pre = raw.replace(
    /(^\s*.*<<EOF\n)([\s\S]*?\n)(\s*EOF)/gm,
    (_m, start, body, end) => {
      const indent = start.match(/^(\s*)/)[1] + "  ";
      const indented = body
        .split("\n")
        .map((l) => (l ? indent + l : ""))
        .join("\n");
      return start + indented + indent + end.trim();
    },
  );
  const lineCounter = new yaml.LineCounter();
  let doc;
  try {
    doc = yaml.parseDocument(pre, {
      prettyErrors: true,
      uniqueKeys: true,
      lineCounter,
    });
  } catch (e) {
    const pos = e.linePos?.[0];
    const loc = pos ? `:${pos.line}:${pos.col}` : "";
    throw new Error(`${abs}${loc} ${e.message}`);
  }
  if (doc.errors.length) {
    const e = doc.errors[0];
    const pos = e.linePos?.[0];
    const loc = pos ? `:${pos.line}:${pos.col}` : "";
    throw new Error(`${abs}${loc} ${e.message}`);
  }
  function loc(node) {
    const pos = node && node.range ? lineCounter.linePos(node.range[0]) : { line: 0, col: 0 };
    return `${abs}:${pos.line}:${pos.col}`;
  }
  if (!doc.get("name") || !doc.get("description")) {
    throw new Error(`${abs}:1 name/description required`);
  }
  const runs = doc.get("runs", true);
  const using = runs?.get("using", true);
  if (!using || using.toString() !== "composite") {
    throw new Error(`${loc(using || runs)} runs.using must be "composite"`);
  }
  const stepsNode = runs.get("steps", true);
  if (!stepsNode || stepsNode.items.length === 0) {
    throw new Error(`${loc(stepsNode || runs)} steps must be non-empty array`);
  }
  let scriptCount = 0;
  let uploadFound = false;
  for (const item of stepsNode.items) {
    const step = item.toJSON();
    const hasUses = Object.prototype.hasOwnProperty.call(step, "uses");
    const hasRun = Object.prototype.hasOwnProperty.call(step, "run");
    if (hasUses && hasRun) {
      throw new Error(`${loc(item)} step has both uses and run`);
    }
    if (hasRun) {
      scriptCount++;
      const shellNode = item.get("shell", true);
      if (!shellNode) {
        throw new Error(`${loc(item)} step missing shell`);
      }
      if (shellNode.toString() !== "bash") {
        throw new Error(`${loc(shellNode)} script step shell must be bash`);
      }
    } else if (!hasUses) {
      throw new Error(`${loc(item)} step missing uses or run`);
    }
    if (hasUses && /^actions\/upload-artifact@/.test(step.uses)) {
      const pathNode = item.get("with", true)?.get("path", true);
      if (!pathNode || pathNode.toString() !== "ci/metrics/series.ndjson") {
        throw new Error(`${loc(pathNode || item)} upload-artifact path must be ci/metrics/series.ndjson`);
      }
      uploadFound = true;
    }
  }
  if (scriptCount !== 1) {
    throw new Error(`${loc(stepsNode)} expected exactly one script step, found ${scriptCount}`);
  }
  if (!uploadFound) {
    throw new Error(`${loc(stepsNode)} missing upload-artifact step`);
  }
  const inputs = doc.get("inputs", true);
  const timings = inputs?.get("timings", true);
  const timingsReq = timings?.get("required", true);
  if (!timings || timingsReq?.toJSON() !== true) {
    throw new Error(`${loc(timingsReq || timings || inputs)} inputs.timings.required must be true`);
  }
  const inventory = inputs?.get("inventory", true);
  const invDef = inventory?.get("default", true);
  if (!inventory || invDef === undefined) {
    throw new Error(`${loc(inventory || inputs)} inputs.inventory.default required`);
  }
  if (typeof invDef.toJSON() !== "string") {
    throw new Error(`${loc(invDef)} inputs.inventory.default must be string`);
  }
}

module.exports = { audit };

if (require.main === module) {
  const target =
    process.argv[2] || ".github/actions/ci-metrics-emit/action.yml";
  try {
    audit(target);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
