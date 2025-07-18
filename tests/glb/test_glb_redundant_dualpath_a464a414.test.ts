const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const request = require("../backend/node_modules/supertest");
const { Document, NodeIO } = require("@gltf-transform/core");

jest.mock("../backend/src/lib/sparc3dClient", () => ({
  generateGlb: jest.fn(),
}));

jest.mock("../backend/src/lib/storeGlb", () => ({
  storeGlb: jest.fn(),
}));

const { generateGlb } = require("../backend/src/lib/sparc3dClient");
const { storeGlb } = require("../backend/src/lib/storeGlb");
const { generateModel } = require("../backend/src/pipeline/generateModel");
const app = require("../backend/server");

function createGlb() {
  const doc = new Document();
  doc.createBuffer();
  const pos = doc
    .createAccessor()
    .setType("VEC3")
    .setArray(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]));
  const prim = doc.createPrimitive();
  prim.setAttribute("POSITION", pos);
  doc.createMesh().addPrimitive(prim);
  doc.createNode("n").setMesh(doc.getRoot().listMeshes()[0]);
  const io = new NodeIO();
  const glb = io.writeBinary(doc);
  return Buffer.from(glb);
}

function checksum(file) {
  const data = fs.readFileSync(file);
  return crypto.createHash("sha256").update(data).digest("hex");
}

beforeEach(() => {
  const glb = createGlb();
  generateGlb.mockResolvedValue(glb);
  let counter = 0;
  storeGlb.mockImplementation((data) => {
    const file = path.join(__dirname, `out_${counter++}.glb`);
    fs.writeFileSync(file, data);
    return Promise.resolve(file);
  });
});

afterEach(() => {
  jest.resetAllMocks();
  fs.readdirSync(__dirname)
    .filter((f) => f.startsWith("out_"))
    .forEach((f) => fs.unlinkSync(path.join(__dirname, f)));
});

test("pipeline direct vs API output matches", async () => {
  const directPath = await generateModel({ prompt: "p" });
  const apiRes = await request(app).post("/api/generate").field("prompt", "p");
  expect(apiRes.status).toBe(200);
  const apiPath = apiRes.body.glb_url;

  expect(fs.existsSync(directPath)).toBe(true);
  expect(fs.existsSync(apiPath)).toBe(true);

  const size1 = fs.statSync(directPath).size;
  const size2 = fs.statSync(apiPath).size;
  const diff = Math.abs(size1 - size2) / ((size1 + size2) / 2);
  expect(diff).toBeLessThanOrEqual(0.01);

  const sum1 = checksum(directPath);
  const sum2 = checksum(apiPath);
  expect(sum1).toBe(sum2);
});
