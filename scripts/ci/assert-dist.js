#!/usr/bin/env node
const fs = require("fs");
const file = "frontend/dist/index.html";
if (fs.existsSync(file)) {
  process.exit(0);
} else {
  console.error(`Missing ${file}`);
  process.exit(2);
}
