import fs from "fs";
import path from "path";

export function resolveLocalFile(
  filePath: string,
  allowedDirs: string[],
  errMsg = "file not found",
): string {
  const resolved = path.resolve(filePath);
  for (const dir of allowedDirs.map((d) => path.resolve(d))) {
    if (resolved === dir || resolved.startsWith(dir + path.sep)) {
      if (fs.existsSync(resolved)) return resolved;
      break;
    }
  }
  throw new Error(errMsg);
}
