#!/usr/bin/env node
const fs = require("fs");

const file = process.argv[2];
if (!file || !fs.existsSync(file)) {
  console.error(`Test result file not found: ${file}`);
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(file, "utf8"));
const durations = [];
for (const tr of data.testResults || []) {
  const perf = tr.perfStats || {};
  const runtime =
    typeof perf.runtime === "number" ? perf.runtime : perf.end - perf.start;
  if (runtime) {
    durations.push({ name: tr.name, duration: runtime });
  }
}
if (!durations.length) process.exit(0);

durations.sort((a, b) => a.duration - b.duration);
const idx = Math.floor(durations.length * 0.9);
const threshold = durations[idx].duration;
const slow = durations.filter((d) => d.duration >= threshold);
console.log(`90th percentile duration: ${threshold}ms`);
if (slow.length) {
  console.log("Potentially flaky tests:");
  for (const s of slow) {
    console.log(` - ${s.name} (${s.duration}ms)`);
  }
}
