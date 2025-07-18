const axios = require("axios");
const { NodeIO } = require("@gltf-transform/core");
const { validateBytes } = require("gltf-validator");
const { generateModel } = require("../backend/src/pipeline/generateModel");

const run = process.env.STABILITY_KEY ? test : test.skip;

run("generated glb passes structural validation", async () => {
  const url = await generateModel({ prompt: "validation test cube" });
  const res = await axios.get(url, { responseType: "arraybuffer" });
  const buf = Buffer.from(res.data);

  // validate binary header
  expect(buf.slice(0, 4).toString()).toBe("glTF");

  // run gltf-validator
  const report = await validateBytes(new Uint8Array(buf), {
    maxIssues: 1,
    writeTimestamp: false,
  });
  expect(report.issues.numErrors).toBe(0);

  // parse with NodeIO for additional checks
  const doc = await new NodeIO().readBinary(buf);
  const root = doc.getRoot();
  expect(root.listMeshes().length).toBeGreaterThan(1);
  expect(root.listMaterials().length).toBeGreaterThan(0);
  expect(root.listTextures().length).toBeGreaterThan(0);
});
