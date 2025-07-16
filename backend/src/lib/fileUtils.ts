import fs from "fs";
import path from "path";

export function resolveLocalFile(
  filePath: string,
  allowedDirs: string[],
  errMsg = "file not found",
): string {
  if (!/^[\w./-]+$/.test(filePath)) {
    throw new Error("invalid path");
  }
  const normalized = path.normalize(filePath);
  const resolved = path.isAbsolute(normalized)
    ? normalized
    : path.resolve(normalized);
  for (const dir of allowedDirs.map((d) => path.resolve(d))) {
    if (resolved === dir || resolved.startsWith(dir + path.sep)) {
      if (fs.existsSync(resolved)) return resolved;
      break;
    }
  }
  throw new Error(errMsg);
}
