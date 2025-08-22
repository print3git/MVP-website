import { mkdtempSync, rmSync, writeFileSync, cpSync, mkdirSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { spawnSync } from "child_process";

const repoRoot = path.join(__dirname, "..");
const nodeModules = path.join(repoRoot, "node_modules");
const binPath = path.join(nodeModules, ".bin");

function createTempRepo() {
  const tmp = mkdtempSync(path.join(tmpdir(), "ci-audit-"));
  mkdirSync(path.join(tmp, "scripts"), { recursive: true });
  cpSync(
    path.join(repoRoot, "scripts", "ci-audit.ts"),
    path.join(tmp, "scripts", "ci-audit.ts"),
  );
  cpSync(path.join(repoRoot, ".github"), path.join(tmp, ".github"), {
    recursive: true,
  });
  writeFileSync(
    path.join(tmp, "package.json"),
    JSON.stringify({ scripts: { "ci:audit": "tsx scripts/ci-audit.ts" } }),
  );
  return tmp;
}

function runAudit(cwd: string, nodePath: string) {
  return spawnSync("npm", ["run", "ci:audit"], {
    cwd,
    env: {
      ...process.env,
      NODE_PATH: nodePath,
      PATH: `${binPath}${path.delimiter}${process.env.PATH}`,
    },
    encoding: "utf8",
  });
}

test("ci:audit succeeds with dependencies", () => {
  const tmp = createTempRepo();
  const res = runAudit(tmp, nodeModules);
  rmSync(tmp, { recursive: true, force: true });
  expect(res.status).toBe(0);
});

test("ci:audit fails when yaml is missing", () => {
  const tmp = createTempRepo();
  const res = runAudit(tmp, path.join(tmp, "empty"));
  rmSync(tmp, { recursive: true, force: true });
  expect(res.status).not.toBe(0);
  expect(res.stderr + res.stdout).toMatch(
    /missing required dependency "yaml"/i,
  );
});
