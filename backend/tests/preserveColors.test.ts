const { preserveColors } = require("../src/lib/preserveColors.js");
const { NodeIO, Document } = require("@gltf-transform/core");

describe("preserveColors", () => {
  async function makeGlb() {
    const doc = new Document();
    const buffer = doc.createBuffer();
    const position = doc
      .createAccessor()
      .setType("VEC3")
      .setArray(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]));
    const prim = doc.createPrimitive();
    prim.setAttribute("POSITION", position);
    prim.setExtras({ vertexColors: [1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 1] });
    const mesh = doc.createMesh().addPrimitive(prim);
    doc.createNode("n").setMesh(mesh);
    const io = new NodeIO();
    return await io.writeBinary(doc);
  }

  test("promotes vertexColors extras to COLOR_0 attribute", async () => {
    const buf = await makeGlb();
    const out = await preserveColors(buf);
    const io = new NodeIO();
    const doc = await io.readBinary(out);
    const prim = doc.getRoot().listMeshes()[0].listPrimitives()[0];
    const attr = prim.getAttribute("COLOR_0");
    expect(attr).toBeDefined();
    expect(Array.from(attr.getArray())).toEqual([
      1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 1,
    ]);
  });
});
