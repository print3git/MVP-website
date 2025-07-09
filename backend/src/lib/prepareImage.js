"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prepareImage = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const uploadS3_1 = require("./uploadS3");
function __importDefault(mod) { return (mod && mod.__esModule) ? mod : { default: mod }; }
async function prepareImage(image) {
  if (/^https?:\/\//.test(image)) {
    return image;
  }
  let filePath = image;
  let cleanup = false;
  if (image.startsWith('data:')) {
    const [, base64] = image.split(',', 2);
    filePath = path_1.default.join('/tmp', `${Date.now()}-${Math.random().toString(36).slice(2)}.png`);
    await fs_1.default.promises.writeFile(filePath, Buffer.from(base64, 'base64'));
    cleanup = true;
  }
  else if (!fs_1.default.existsSync(image)) {
    throw new Error('image file not found');
  }
  try {
    return await (0, uploadS3_1.uploadFile)(filePath, 'image/png');
  }
  finally {
    if (cleanup)
      fs_1.default.unlink(filePath, () => { });
  }
}
exports.prepareImage = prepareImage;
