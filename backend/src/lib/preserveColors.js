const { NodeIO } = require("@gltf-transform/core");

async function preserveColors(glb) {
  const io = new NodeIO();
  const doc = await io.readBinary(glb);
  const root = doc.getRoot();
  for (const mesh of root.listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const extras = prim.getExtras() || {};
      if (!prim.getAttribute("COLOR_0")) {
        if (Array.isArray(extras.vertexColors)) {
          const accessor = doc
            .createAccessor()
            .setType("VEC4")
            .setArray(new Float32Array(extras.vertexColors));
          prim.setAttribute("COLOR_0", accessor);
        } else if (Array.isArray(extras.flatColor)) {
          const mat = prim.getMaterial() || doc.createMaterial();
          mat.setBaseColorFactor(extras.flatColor);
          prim.setMaterial(mat);
        }
      }
    }
  }
  return io.writeBinary(doc);
}

module.exports = { preserveColors };
