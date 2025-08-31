#!/usr/bin/env node
const glob = require("glob");

const matches = glob.sync("frontend/dist/**/models/boombox.glb");
if (matches.length === 0) {
  console.error("Error: frontend/dist/**/models/boombox.glb is missing");
  process.exit(1);
}
