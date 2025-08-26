"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateModel = generateModel;
async function generateModel({ prompt, image }) {
  if (!prompt && !image) {
    throw new Error("prompt or image required");
  }
  return Buffer.from("glb");
}
exports.default = generateModel;
