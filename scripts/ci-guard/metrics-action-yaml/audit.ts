const fs = require("fs");
const path = require("path");
const yaml = require("yaml");

function audit(file) {
  const abs = path.resolve(file);
  if (!fs.existsSync(abs)) {
    throw new Error(`File not found: ${abs}`);
  }
  const raw = fs.readFileSync(abs, "utf8");
  if (raw.includes("\t")) {
    throw new Error("Tabs detected");
  }
  if (/\r/.test(raw)) {
    throw new Error("CRLF line endings detected");
  }
  const lines = raw.split("\n");
  lines.forEach((line, idx) => {
    const m = line.match(/^( +)\S/);
    if (m) {
      if (m[1].length % 2 !== 0) {
        throw new Error(`Invalid indentation on line ${idx + 1}`);
      }
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
  let doc;
  try {
    doc = yaml.parseDocument(pre, { prettyErrors: true, uniqueKeys: true });
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
  const data = doc.toJSON();
  if (!data.name || !data.description) {
    throw new Error("name/description required");
  }
  if (data.runs?.using !== "composite") {
    throw new Error('runs.using must be "composite"');
  }
  const steps = data.runs?.steps;
  if (!Array.isArray(steps) || steps.length === 0) {
    throw new Error("steps must be non-empty array");
  }
  for (const [i, step] of steps.entries()) {
    const hasUses = Object.prototype.hasOwnProperty.call(step, "uses");
    const hasRun = Object.prototype.hasOwnProperty.call(step, "run");
    const hasShell = Object.prototype.hasOwnProperty.call(step, "shell");
    if (hasUses && hasRun) {
      throw new Error(`step ${i} has both uses and run`);
    }
    if (hasRun) {
      if (!hasShell) throw new Error(`step ${i} missing shell`);
    } else if (!hasUses) {
      throw new Error(`step ${i} missing uses or run`);
    }
  }
  const timings = data.inputs?.timings;
  if (!timings || timings.required !== true) {
    throw new Error("inputs.timings.required must be true");
  }
  const inventory = data.inputs?.inventory;
  if (!inventory || inventory.default === undefined) {
    throw new Error("inputs.inventory.default required");
  }
  if (typeof inventory.default !== "string") {
    throw new Error("inputs.inventory.default must be string");
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
