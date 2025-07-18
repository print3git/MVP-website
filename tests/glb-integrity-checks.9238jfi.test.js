const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const { Document, NodeIO } = require("@gltf-transform/core");

async function createGlb() {
  const doc = new Document();
  doc.createBuffer();
  const pos = doc
    .createAccessor()
    .setType("VEC3")
    .setArray(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]));
  doc
    .createMesh()
    .addPrimitive(doc.createPrimitive().setAttribute("POSITION", pos));
  doc.createNode("n").setMesh(doc.getRoot().listMeshes()[0]);
  const io = new NodeIO();
  const arr = await io.writeBinary(doc);
  return Buffer.from(arr);
}

test("generated glb passes integrity check", async () => {
  const buf = await createGlb();
  const tmp = path.join(os.tmpdir(), `glb-${Date.now()}.glb`);
  fs.writeFileSync(tmp, buf);
  const res = spawnSync(
    process.execPath,
    [path.join("scripts", "verify-glb-integrity-329vkd.js"), tmp],
    { encoding: "utf8" },
  );
  fs.unlinkSync(tmp);
  const output = (res.stdout || "") + (res.stderr || "");
  if (res.status !== 0) {
    throw new Error(output);
  }
  expect(res.status).toBe(0);
});
