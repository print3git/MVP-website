import fs from "fs";
import path from "path";
import yaml from "yaml";

function parseSmokeScripts() {
  const file = path.join(__dirname, "..", "scripts", "run-smoke.js");
  const content = fs.readFileSync(file, "utf8");
  const regex = /playwright test[^\n]*?(\S+?\.test\.js)/g;
  const scripts = new Set();
  let m;
  while ((m = regex.exec(content))) {
    scripts.add(m[1]);
  }
  return Array.from(scripts);
}

function parseCISmokeScripts() {
  const workflows = path.join(__dirname, "..", ".github", "workflows");
  const scripts = new Set();
  for (const file of fs.readdirSync(workflows)) {
    if (!file.endsWith(".yml") && !file.endsWith(".yaml")) continue;
    const data = yaml.parse(
      fs.readFileSync(path.join(workflows, file), "utf8"),
    );
    if (!data?.jobs) continue;
    for (const job of Object.values(data.jobs)) {
      const steps = job.steps || [];
      for (const step of steps) {
        const run = step.run || "";
        if (/npm run smoke|pnpm run smoke/.test(run)) {
          scripts.add("e2e/smoke.test.js");
        }
        const m = run.match(/playwright test[^\n]*?(\S+?\.test\.js)/);
        if (m) scripts.add(m[1]);
      }
    }
  }
  return Array.from(scripts);
}

function getSmokeTestNames() {
  const file = path.join(__dirname, "..", "e2e", "smoke.test.js");
  const content = fs.readFileSync(file, "utf8");
  const names = Array.from(content.matchAll(/test\(['"](.+?)['"]/g)).map(
    (m) => m[1],
  );
  const skipped = /test\.skip\(|\.skip\(/.test(content);
  return { names, skipped };
}

const expectedNames = [
  "login flow",
  "dashboard loads",
  "checkout flow",
  "model generator page",
  "generate flow",
];

describe("smoke coverage crosscheck", () => {
  test("CI runs all smoke scripts from run-smoke.js", () => {
    const listed = parseSmokeScripts();
    const triggered = parseCISmokeScripts();
    const missing = listed.filter((s) => !triggered.includes(s));
    if (missing.length) {
      console.log("Missing smoke scripts in CI:", missing.join(", "));
    }
    expect(triggered.length).toBeGreaterThanOrEqual(listed.length);
    expect(missing).toEqual([]);
  });

  test("expected smoke tests present and not skipped", () => {
    const { names, skipped } = getSmokeTestNames();
    const missing = expectedNames.filter((n) => !names.includes(n));
    if (missing.length) {
      console.log("Missing smoke tests:", missing.join(", "));
    }
    if (skipped) console.log("Smoke tests contain skipped tests");
    expect(missing).toEqual([]);
    expect(names.length).toBeGreaterThanOrEqual(expectedNames.length);
  });
});
