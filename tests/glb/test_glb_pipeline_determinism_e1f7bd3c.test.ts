import fs from "fs";
import path from "path";
import crypto from "crypto";
import { Document, NodeIO } from "@gltf-transform/core";

jest.mock("../../backend/src/lib/textToImage", () => ({
  textToImage: jest.fn(),
}));
jest.mock("../../backend/src/lib/imageToText", () => ({
  imageToText: jest.fn(),
}));
jest.mock("../../backend/src/lib/prepareImage", () => ({
  prepareImage: jest.fn(),
}));
jest.mock("../../backend/src/lib/sparc3dClient", () => ({
  generateGlb: jest.fn(),
}));
jest.mock("../../backend/src/lib/preserveColors", () => ({
  preserveColors: jest.fn((b) => Promise.resolve(b)),
}));
jest.mock("../../backend/src/lib/storeGlb", () => ({ storeGlb: jest.fn() }));

const textToImageMod = require("../../backend/src/lib/textToImage");
const imageToTextMod = require("../../backend/src/lib/imageToText");
const prepareImageMod = require("../../backend/src/lib/prepareImage");
const sparcMod = require("../../backend/src/lib/sparc3dClient");
const preserveMod = require("../../backend/src/lib/preserveColors");
const storeMod = require("../../backend/src/lib/storeGlb");

const { generateModel } = require("../../backend/src/pipeline/generateModel");

async function makeGlb() {
  const doc = new Document();
  doc.createBuffer();
  const pos = doc
    .createAccessor()
    .setType("VEC3")
    .setArray(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]));
  const prim = doc.createPrimitive();
  prim.setAttribute("POSITION", pos);
  prim.setExtras({ vertexColors: [1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 1] });
  doc.createMesh().addPrimitive(prim);
  doc.createNode("n").setMesh(doc.getRoot().listMeshes()[0]);
  const io = new NodeIO();
  return Buffer.from(await io.writeBinary(doc));
}

describe("glb pipeline determinism", () => {
  /** @type {Buffer[]} */
  const outputs = [];
  let dateSpy;
  let randSpy;

  beforeAll(() => {
    dateSpy = jest.spyOn(Date, "now").mockReturnValue(1);
    randSpy = jest.spyOn(Math, "random").mockReturnValue(0.5);
  });

  afterAll(() => {
    dateSpy.mockRestore();
    randSpy.mockRestore();
  });

  beforeEach(async () => {
    jest.resetAllMocks();
    textToImageMod.textToImage.mockResolvedValue("http://img");
    imageToTextMod.imageToText.mockResolvedValue("prompt");
    prepareImageMod.prepareImage.mockResolvedValue("http://img");
    const glb = await makeGlb();
    sparcMod.generateGlb.mockResolvedValue(glb);
    preserveMod.preserveColors.mockImplementation((b) => Promise.resolve(b));
    storeMod.storeGlb.mockImplementation(async (b) => {
      outputs.push(Buffer.from(b));
      return "https://cdn/model.glb";
    });
  });

  afterEach(() => {
    outputs.length = 0;
  });

  test("pipeline output is deterministic", async () => {
    const url1 = await generateModel({ prompt: "hello" });
    const out1 = outputs[0];
    const file1 = path.join("/tmp", "glb_det_1.glb");
    fs.writeFileSync(file1, out1);

    const url2 = await generateModel({ prompt: "hello" });
    const out2 = outputs[1];
    const file2 = path.join("/tmp", "glb_det_2.glb");
    fs.writeFileSync(file2, out2);

    expect(url1).toBe("https://cdn/model.glb");
    expect(url2).toBe("https://cdn/model.glb");

    const sizeDiff = Math.abs(out1.length - out2.length);
    expect(sizeDiff).toBeLessThanOrEqual(out1.length * 0.01);

    const hash = (buf) =>
      crypto.createHash("sha256").update(buf).digest("base64");
    expect(hash(out1)).toBe(hash(out2));
    expect(out1.equals(out2)).toBe(true);
  });
});
