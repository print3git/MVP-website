import fs from "fs";
import path from "path";

function safeJoin(base: string, userPath: string) {
  const target = path.normalize(
    path.isAbsolute(userPath) ? userPath : path.join(base, userPath),
  );
  if (!target.startsWith(path.normalize(base + path.sep))) {
    throw new Error("Invalid path");
  }
  return target;
}

export function resolveLocalFile(
  filePath: string,
  allowedDirs: string[],
  errMsg = "file not found",
): string {
  const normalized = path.normalize(filePath);
  for (const dir of allowedDirs.map((d) => path.resolve(d))) {
    try {
      const candidate = safeJoin(dir, normalized);
      if (fs.existsSync(candidate)) return candidate;
    } catch {
      // ignore invalid paths for this dir
    }
  }
  throw new Error(errMsg);
}
