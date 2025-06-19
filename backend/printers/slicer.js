const fs = require("fs").promises;
const path = require("path");

async function sliceModel(modelPath, outDir = "/tmp") {
  if (!modelPath) throw new Error("modelPath required");
  const ext = path.extname(modelPath);
  const base = path.basename(modelPath, ext);
  const outPath = path.join(outDir, `${base}.gcode`);
  await fs.copyFile(modelPath, outPath);
  return outPath;
}

module.exports = sliceModel;
