#!/usr/bin/env node
const fs = require("fs");
const { NodeIO } = require("@gltf-transform/core");

const file = process.argv[2];
if (!file || !fs.existsSync(file)) {
  console.error("file not found");
  process.exit(1);
}
try {
  const io = new NodeIO();
  const doc = io.readBinary(fs.readFileSync(file));
  const root = doc.getRoot();
  if (!root.listScenes().length) throw new Error("no scenes");
  if (!root.listMeshes().length) throw new Error("no meshes");
  for (const accessor of root.listAccessors()) {
    const arr = accessor.getArray();
    if (!arr || !arr.length) throw new Error("empty accessor");
  }
  console.log("GLB valid");
} catch (err) {
  console.error(err.message || err);
  process.exit(1);
}
