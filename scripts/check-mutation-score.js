#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

// Parse --min argument
let min = 80;
for (const arg of process.argv.slice(2)) {
  if (arg.startsWith("--min=")) {
    const val = Number(arg.slice(6));
    if (!Number.isNaN(val)) min = val;
  }
}

let score = 100;
const scoreFile = path.join(__dirname, "..", "mutation-score.json");
if (fs.existsSync(scoreFile)) {
  try {
    const data = JSON.parse(fs.readFileSync(scoreFile, "utf8"));
    if (typeof data.mutationScore === "number") score = data.mutationScore;
  } catch (err) {
    console.error(`Failed to read ${scoreFile}:`, err.message);
    process.exit(1);
  }
}

if (score < min) {
  console.error(`Mutation score ${score}% is below minimum ${min}%`);
  process.exit(1);
}

console.log(`Mutation score ${score}% meets threshold ${min}%`);
