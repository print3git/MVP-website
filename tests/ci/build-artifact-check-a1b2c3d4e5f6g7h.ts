import { execSync } from "child_process";
import { promises as fs } from "fs";
import path from "path";

const repoRoot = path.resolve(__dirname, "../..");

async function verifyFile(file) {
  let stat;
  try {
    stat = await fs.lstat(file);
  } catch (_err) {
    throw new Error(
      `Cannot stat ${path.relative(repoRoot, file)}: ${_err.message}`,
    );
  }

  if (stat.isSymbolicLink()) {
    let target;
    try {
      target = await fs.readlink(file);
    } catch (_err) {
      throw new Error(`Broken symlink ${path.relative(repoRoot, file)}`);
    }
    const resolved = path.resolve(path.dirname(file), target);
    try {
      await fs.access(resolved);
    } catch (_err) {
      throw new Error(
        `Dangling symlink ${path.relative(repoRoot, file)} -> ${target}`,
      );
    }
  }

  try {
    await fs.access(file, fs.constants.R_OK);
  } catch (_err) {
    throw new Error(`Inaccessible file ${path.relative(repoRoot, file)}`);
  }
}

test("build directory has no broken links", async () => {
  const gitFiles = execSync("git ls-files", { cwd: repoRoot, encoding: "utf8" })
    .split("\n")
    .filter(Boolean);

  for (const rel of gitFiles) {
    const abs = path.join(repoRoot, rel);
    await verifyFile(abs);
  }
});
