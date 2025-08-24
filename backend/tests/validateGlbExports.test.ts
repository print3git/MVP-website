const { preserveColors } = require("../src/lib/preserveColors.js");
const { Document, NodeIO } = require("@gltf-transform/core");

function createSampleGlb() {
  const doc = new Document();
  doc.createBuffer();
  const position = doc
    .createAccessor()
    .setType("VEC3")
    .setArray(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]));
  const prim = doc.createPrimitive().setAttribute("POSITION", position);
  const mesh = doc.createMesh().addPrimitive(prim);
  doc.createNode("n").setMesh(mesh);
  doc.createScene("s").addChild(doc.getRoot().listNodes()[0]);
  const io = new NodeIO();
  return io.writeBinary(doc);
}

describe("glb export validity", () => {
  test("generated glb has scenes, meshes and buffers", async () => {
    const base = await createSampleGlb();
    const out = await preserveColors(base);
    const io = new NodeIO();
    const doc = await io.readBinary(out);
    const root = doc.getRoot();
    expect(root.listScenes().length).toBeGreaterThan(0);
    expect(root.listMeshes().length).toBeGreaterThan(0);
    for (const accessor of root.listAccessors()) {
      const array = accessor.getArray();
      expect(array && array.length).toBeGreaterThan(0);
    }
  });
});
