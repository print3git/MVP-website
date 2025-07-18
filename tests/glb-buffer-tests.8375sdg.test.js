const seedrandom = require("seedrandom");
const { NodeIO, Document } = require("@gltf-transform/core");
const { preserveColors } = require("../backend/src/lib/preserveColors.js");

/**
 * Create a minimal glb buffer for testing.
 * @param {object} params Options describing color metadata
 * @param {number[]} [params.vertexColors] RGBA vertex color data
 * @param {number[]} [params.flatColor] RGBA material color factor
 * @returns {Promise<Buffer>} glb binary
 */
async function makeGlb({ vertexColors, flatColor }) {
  const doc = new Document();
  doc.createBuffer();
  const position = doc
    .createAccessor()
    .setType("VEC3")
    .setArray(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]));
  const prim = doc.createPrimitive();
  prim.setAttribute("POSITION", position);
  if (vertexColors) prim.setExtras({ vertexColors });
  else if (flatColor) prim.setExtras({ flatColor });
  const mesh = doc.createMesh().addPrimitive(prim);
  doc.createNode("n").setMesh(mesh);
  const io = new NodeIO();
  return io.writeBinary(doc);
}

describe("preserveColors buffer generation", () => {
  const rng = seedrandom("glb-buffer-tests");
  const successCases = Array.from({ length: 100 }, (_, i) => ({
    id: i,
    vertexColors:
      rng() < 0.33
        ? Array.from({ length: 12 }, () => Math.round(rng() * 10) / 10)
        : undefined,
    flatColor:
      rng() > 0.66
        ? [
            Math.round(rng() * 10) / 10,
            Math.round(rng() * 10) / 10,
            Math.round(rng() * 10) / 10,
            1,
          ]
        : undefined,
  }));

  successCases.forEach(({ id, vertexColors, flatColor }) => {
    it(`generates valid buffer for case ${id}`, async () => {
      const glb = await makeGlb({ vertexColors, flatColor });
      const out = await preserveColors(glb);
      expect(Buffer.isBuffer(out)).toBe(true);
      expect(out.slice(0, 4).toString("utf8")).toBe("glTF");
      expect(out.length).toBeGreaterThan(12);

      const doc = await new NodeIO().readBinary(out);
      const prim = doc.getRoot().listMeshes()[0].listPrimitives()[0];
      if (vertexColors) {
        const attr = prim.getAttribute("COLOR_0");
        expect(attr).toBeDefined();
        expect(Array.from(attr.getArray())).toEqual(vertexColors);
      } else if (flatColor) {
        const mat = prim.getMaterial();
        expect(mat.getBaseColorFactor()).toEqual(flatColor);
      } else {
        expect(prim.getAttribute("COLOR_0")).toBeUndefined();
      }

      // round-trip
      const rt = await new NodeIO().writeBinary(doc);
      expect(Buffer.isBuffer(rt)).toBe(true);
      expect(rt.slice(0, 4).toString("utf8")).toBe("glTF");
    });
  });

  const failureCases = Array.from({ length: 20 }, (_, i) => {
    const b = Buffer.alloc(12);
    if (i % 2 === 0) {
      b.write("bad!", 0);
    } else {
      b.write("glTF", 0);
      b.writeUInt32LE(2, 4);
      b.writeUInt32LE(5, 8); // inconsistent length
    }
    return b.slice(0, 8 + (i % 4));
  });

  failureCases.forEach((buf, i) => {
    it(`rejects invalid glb buffer case ${i}`, async () => {
      await expect(preserveColors(buf)).rejects.toThrow();
    });
  });
});
