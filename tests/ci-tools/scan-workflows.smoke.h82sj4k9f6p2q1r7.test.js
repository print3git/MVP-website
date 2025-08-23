const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync, spawnSync } = require("child_process");

describe("scan-workflows smoke", () => {
  const script = path.resolve(
    __dirname,
    "../../scripts/ci-tools/scan-workflows.js",
  );

  test("detects self-hosted, ubuntu-latest, and ecr", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "wf-"));
    const wfDir = path.join(tmp, ".github", "workflows");
    fs.mkdirSync(wfDir, { recursive: true });
    fs.writeFileSync(
      path.join(wfDir, "self.yml"),
      `name: a\njobs:\n  t:\n    runs-on: [self-hosted, linux]\n`,
    );
    fs.writeFileSync(
      path.join(wfDir, "ubuntu.yml"),
      `name: b\njobs:\n  t:\n    runs-on: ubuntu-latest\n`,
    );
    fs.writeFileSync(path.join(tmp, "Dockerfile"), "# ecr reference");

    const selfHosted = JSON.parse(
      execFileSync("node", [script, "--self-hosted"], {
        cwd: tmp,
        encoding: "utf8",
      }),
    );
    expect(selfHosted.some((line) => line.includes("self.yml"))).toBe(true);

    const ubuntu = JSON.parse(
      execFileSync("node", [script, "--ubuntu-latest"], {
        cwd: tmp,
        encoding: "utf8",
      }),
    );
    expect(ubuntu).toContain(".github/workflows/ubuntu.yml");

    const ecr = JSON.parse(
      execFileSync("node", [script, "--grep", "ecr"], {
        cwd: tmp,
        encoding: "utf8",
      }),
    );
    expect(ecr).toContain("Dockerfile");
  });

  test("exits 0 even without rg", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "wf-"));
    const res = spawnSync("node", [script, "--self-hosted"], { cwd: tmp });
    expect(res.status).toBe(0);
  });
});
