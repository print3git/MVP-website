const { spawnSync } = require("child_process");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..", "..");

function getFileList() {
  const git = spawnSync(
    "git",
    ["ls-files", "backend/src/**/*.js", "backend/src/**/*.ts"],
    {
      cwd: repoRoot,
      encoding: "utf-8",
    },
  );
  return git.stdout.trim().split(/\n+/).filter(Boolean);
}

describe("ESLint each file separately", () => {
  const files = getFileList();
  for (const file of files) {
    test(file, () => {
      const eslintPath = path.join(repoRoot, "node_modules", ".bin", "eslint");
      const result = spawnSync(
        "node",
        ["--experimental-vm-modules", eslintPath, file],
        {
          cwd: repoRoot,
          encoding: "utf-8",
        },
      );
      if (result.status !== 0) {
        console.error(`\nLint errors in ${file}:\n`);
        if (result.stdout) console.error(result.stdout);
        if (result.stderr) console.error(result.stderr);
      }
      expect(result.status).toBe(0);
    });
  }
});
