"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.imageToText = void 0;
const axios_1 = __importDefault(require("axios"));
async function imageToText(imageURL) {
  const endpoint = process.env.IMAGE2TEXT_ENDPOINT;
  const key = process.env.IMAGE2TEXT_KEY;
  if (!endpoint) throw new Error("IMAGE2TEXT_ENDPOINT is not set");
  const res = await axios_1.default.post(
    endpoint,
    { imageURL },
    {
      headers: key ? { Authorization: `Bearer ${key}` } : undefined,
      validateStatus: () => true,
    },
  );
  if (res.status >= 400) {
    const msg = res.data?.error || `request failed with status ${res.status}`;
    throw new Error(msg);
  }
  if (!res.data?.prompt) {
    throw new Error("invalid response from image2text");
  }
  return res.data.prompt;
}
exports.imageToText = imageToText;
