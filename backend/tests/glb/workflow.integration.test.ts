import request from "supertest";
import { Document, NodeIO } from "@gltf-transform/core";

jest.mock("@aws-sdk/client-s3", () => {
  const sendMock = jest.fn();
  return {
    S3Client: jest.fn(() => ({ send: sendMock })),
    PutObjectCommand: jest.fn((opts) => opts),
    __sendMock: sendMock,
  };
});

const { __sendMock: sendMock } = require("@aws-sdk/client-s3");

jest.mock("../../src/lib/textToImage", () => ({ textToImage: jest.fn() }));
jest.mock("../../src/lib/imageToText", () => ({ imageToText: jest.fn() }));
jest.mock("../../src/lib/prepareImage", () => ({ prepareImage: jest.fn() }));
jest.mock("../../src/lib/sparc3dClient", () => ({ generateGlb: jest.fn() }));
jest.mock("../../src/lib/preserveColors", () => ({
  preserveColors: jest.fn((b) => Promise.resolve(b)),
}));

const textToImageMod = require("../../src/lib/textToImage");
const imageToTextMod = require("../../src/lib/imageToText");
const prepareImageMod = require("../../src/lib/prepareImage");
const sparcMod = require("../../src/lib/sparc3dClient");
const preserveMod = require("../../src/lib/preserveColors");

const { generateModel } = require("../../src/pipeline/generateModel");
const app = require("../../server");

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

beforeEach(() => {
  sendMock.mockReset().mockResolvedValue({});
  process.env.AWS_REGION = "us-east-1";
  process.env.S3_BUCKET = "bucket";
  process.env.AWS_ACCESS_KEY_ID = "id";
  process.env.AWS_SECRET_ACCESS_KEY = "secret";
  process.env.SPARC3D_ENDPOINT = "https://api.example";
  process.env.SPARC3D_TOKEN = "token";
  textToImageMod.textToImage.mockResolvedValue("http://img");
  imageToTextMod.imageToText.mockResolvedValue("prompt");
  prepareImageMod.prepareImage.mockResolvedValue("http://img");
});

afterEach(() => {
  jest.resetAllMocks();
  delete process.env.AWS_REGION;
  delete process.env.S3_BUCKET;
  delete process.env.AWS_ACCESS_KEY_ID;
  delete process.env.AWS_SECRET_ACCESS_KEY;
  delete process.env.SPARC3D_ENDPOINT;
  delete process.env.SPARC3D_TOKEN;
});

test("pipeline creates valid glb and uploads", async () => {
  const glb = await makeGlb();
  sparcMod.generateGlb.mockResolvedValue(glb);

  const url = await generateModel({ prompt: "hello" });

  expect(sendMock).toHaveBeenCalled();
  expect(preserveMod.preserveColors).toHaveBeenCalledWith(glb);
  const cmd = sendMock.mock.calls[0][0];
  expect(cmd.Body.slice(0, 4).toString()).toBe("glTF");
  expect(url).toMatch(/bucket\.s3\.us-east-1\.amazonaws\.com/);
});
