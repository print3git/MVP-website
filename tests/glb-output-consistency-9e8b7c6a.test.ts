import { Document, NodeIO } from "@gltf-transform/core";
import crypto from "crypto";

jest.mock("../backend/src/lib/textToImage", () => ({ textToImage: jest.fn() }));
jest.mock("../backend/src/lib/imageToText", () => ({ imageToText: jest.fn() }));
jest.mock("../backend/src/lib/prepareImage", () => ({
  prepareImage: jest.fn(),
}));
jest.mock("../backend/src/lib/sparc3dClient", () => ({
  generateGlb: jest.fn(),
}));
jest.mock("../backend/src/lib/preserveColors", () => ({
  preserveColors: jest.fn(async (b) => b),
}));
jest.mock("../backend/src/lib/storeGlb", () => ({ storeGlb: jest.fn() }));

const { generateModel } = require("../backend/src/pipeline/generateModel");
const textToImage = require("../backend/src/lib/textToImage");
const imageToText = require("../backend/src/lib/imageToText");
const prepareImage = require("../backend/src/lib/prepareImage");
const sparc3dClient = require("../backend/src/lib/sparc3dClient");
const storeGlb = require("../backend/src/lib/storeGlb");

async function makeGlb() {
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
  return Buffer.from(await io.writeBinary(doc));
}

describe("GLB output consistency", () => {
  let glbBuffer;

  beforeAll(async () => {
    glbBuffer = await makeGlb();
  });

  beforeEach(() => {
    jest.resetAllMocks();
    textToImage.textToImage.mockResolvedValue("http://img");
    imageToText.imageToText.mockResolvedValue("prompt");
    prepareImage.prepareImage.mockResolvedValue("http://img");
    sparc3dClient.generateGlb.mockResolvedValue(glbBuffer);
    storeGlb.storeGlb.mockResolvedValue("https://cdn/model.glb");
  });

  test("identical prompts produce identical GLB", async () => {
    const prompt = "a shiny cube";

    await generateModel({ prompt });
    const first = storeGlb.storeGlb.mock.calls[0][0];
    const hash1 = crypto.createHash("sha256").update(first).digest("hex");

    await generateModel({ prompt });
    const second = storeGlb.storeGlb.mock.calls[1][0];
    const hash2 = crypto.createHash("sha256").update(second).digest("hex");

    expect(hash1).toBe(hash2);
  });
});
