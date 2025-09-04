"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveLocalFile = resolveLocalFile;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function safeJoin(base, userPath) {
  const target = path_1.default.normalize(
    path_1.default.isAbsolute(userPath)
      ? userPath
      : path_1.default.join(base, userPath),
  );
  if (!target.startsWith(path_1.default.normalize(base + path_1.default.sep))) {
    throw new Error("Invalid path");
  }
  return target;
}
function resolveLocalFile(filePath, allowedDirs, errMsg = "file not found") {
  const normalized = path_1.default.normalize(filePath);
  for (const dir of allowedDirs.map((d) => path_1.default.resolve(d))) {
    try {
      const candidate = safeJoin(dir, normalized);
      if (fs_1.default.existsSync(candidate)) return candidate;
    } catch (_a) {
      // ignore invalid paths for this dir
    }
  }
  throw new Error(errMsg);
}
