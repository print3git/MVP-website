const { Document, NodeIO } = require("@gltf-transform/core");
const { preserveColors } = require("../src/lib/preserveColors.js");

describe("model to glb conversion", () => {
  async function createRawModel(): Promise<Buffer> {
    const doc = new Document();
    doc.createBuffer();
    const position = doc
      .createAccessor()
      .setType("VEC3")
      .setArray(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]));
    const prim = doc.createPrimitive();
    prim.setAttribute("POSITION", position);
    prim.setExtras({ vertexColors: [1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 1] });
    const mesh = doc.createMesh().addPrimitive(prim);
    const node = doc.createNode("n").setMesh(mesh);
    doc.createScene().addChild(node);
    const io = new NodeIO();
    return Buffer.from(await io.writeBinary(doc));
  }

  test("conversion produces valid glb buffer", async () => {
    const raw = await createRawModel();
    const out = await preserveColors(raw);

    // basic buffer sanity check
    expect(out instanceof Uint8Array).toBe(true);
    expect(Buffer.from(out).slice(0, 4).toString()).toBe("glTF");

    // inspect with gltf-transform to verify structure
    const io = new NodeIO();
    const doc = await io.readBinary(out);
    const root = doc.getRoot();
    expect(root.listScenes().length).toBeGreaterThan(0);
    expect(root.listMeshes().length).toBeGreaterThan(0);
    for (const accessor of root.listAccessors()) {
      const arr = accessor.getArray();
      expect(arr && arr.length).toBeGreaterThan(0);
    }
  });
});
