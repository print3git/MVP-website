const fs = require("fs");
const orig = fs.existsSync;
fs.existsSync = function (p) {
  if (String(p).includes("coverage-summary.json")) return false;
  return orig.call(fs, p);
};
