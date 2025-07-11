import { NodeIO } from '@gltf-transform/core';

/**
 * Convert vertexColors or flatColor metadata stored in primitive extras
 * to standard COLOR_0 attributes or material color factors.
 */
export async function preserveColors(glb: Buffer): Promise<Buffer> {
  const io = new NodeIO();
  const doc = io.readBinary(glb);
  const root = doc.getRoot();

  for (const mesh of root.listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const extras: any = prim.getExtras() || {};
      if (!prim.getAttribute('COLOR_0')) {
        if (Array.isArray(extras.vertexColors)) {
          const accessor = doc
            .createAccessor()
            .setType('VEC4')
            .setArray(new Float32Array(extras.vertexColors));
          prim.setAttribute('COLOR_0', accessor);
        } else if (Array.isArray(extras.flatColor)) {
          const mat = prim.getMaterial() ?? doc.createMaterial();
          mat.setBaseColorFactor(extras.flatColor as [number, number, number, number]);
          prim.setMaterial(mat);
        }
      }
    }
  }

  return io.writeBinary(doc);
}
