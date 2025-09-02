#!/usr/bin/env node
const matches = [];
if (process.env.REQUIRE_MODEL === '1') {
  const glob = require('glob');
  const found = glob.sync("frontend/dist/**/models/boombox.glb");
  if (!found.length) { console.error("Missing boombox.glb"); process.exit(1); }
} else {
  console.log("Skipping model presence check (REQUIRE_MODEL != 1).");
}
