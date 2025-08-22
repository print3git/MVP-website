import { test } from "node:test";
import assert from "node:assert";
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { execFileSync } from "child_process";
import { audit } from "../../../scripts/ci-guard/lfs-migrate-enforce/audit";

type Files = Record<string, string>;

function commitEnv() {
  return {
    ...process.env,
    GIT_COMMITTER_NAME: "t",
    GIT_COMMITTER_EMAIL: "t@t",
    GIT_AUTHOR_NAME: "t",
    GIT_AUTHOR_EMAIL: "t@t",
  };
}

function initRepo(files: Files): string {
  const dir = mkdtempSync(path.join(tmpdir(), "lfs-audit-"));
  execFileSync("git", ["init"], { cwd: dir, stdio: "ignore" });
  for (const [file, content] of Object.entries(files)) {
    const full = path.join(dir, file);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, content);
  }
  execFileSync("git", ["add", "-A"], { cwd: dir, stdio: "ignore" });
  execFileSync("git", ["commit", "-m", "init"], {
    cwd: dir,
    env: commitEnv(),
    stdio: "ignore",
  });
  return dir;
}

test("t1 attributes present for png/jpg → pass", () => {
  const dir = initRepo({
    ".gitattributes":
      "img/*.png filter=lfs diff=lfs merge=lfs -text\nimg/*.jpg filter=lfs diff=lfs merge=lfs -text\n",
    "img/a.png": "version https://git-lfs.github.com/spec/v1\n",
    "img/b.jpg": "version https://git-lfs.github.com/spec/v1\n",
  });
  const res = audit(dir);
  rmSync(dir, { recursive: true, force: true });
  assert.strictEqual(res.ok, true);
});

test("t2 attributes missing → fail", () => {
  const dir = initRepo({
    ".gitattributes": "",
    "img/a.png": "version https://git-lfs.github.com/spec/v1\n",
  });
  const res = audit(dir);
  rmSync(dir, { recursive: true, force: true });
  assert.strictEqual(res.ok, false);
});

test("t3 file wrongly committed as full blob → fail", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "lfs-audit-"));
  execFileSync("git", ["init"], { cwd: dir, stdio: "ignore" });
  mkdirSync(path.join(dir, "img"), { recursive: true });
  writeFileSync(path.join(dir, "img/bad.png"), "not a pointer\n");
  execFileSync("git", ["add", "img/bad.png"], { cwd: dir, stdio: "ignore" });
  execFileSync("git", ["commit", "-m", "file"], {
    cwd: dir,
    env: commitEnv(),
    stdio: "ignore",
  });
  writeFileSync(
    path.join(dir, ".gitattributes"),
    "img/*.png filter=lfs diff=lfs merge=lfs -text\nimg/*.jpg filter=lfs diff=lfs merge=lfs -text\n",
  );
  execFileSync("git", ["add", ".gitattributes"], { cwd: dir, stdio: "ignore" });
  execFileSync("git", ["commit", "-m", "attrs"], {
    cwd: dir,
    env: commitEnv(),
    stdio: "ignore",
  });
  const res = audit(dir);
  rmSync(dir, { recursive: true, force: true });
  assert.strictEqual(res.ok, false);
  assert.ok(res.offending.includes("img/bad.png"));
});

test("t4 correct pointer file passes", () => {
  const dir = initRepo({
    ".gitattributes":
      "img/*.png filter=lfs diff=lfs merge=lfs -text\nimg/*.jpg filter=lfs diff=lfs merge=lfs -text\n",
    "img/p.png": "version https://git-lfs.github.com/spec/v1\n",
  });
  const res = audit(dir);
  rmSync(dir, { recursive: true, force: true });
  assert.strictEqual(res.ok, true);
});

test("t5 mixed directory images (png+jpg) → pass", () => {
  const dir = initRepo({
    ".gitattributes":
      "img/*.png filter=lfs diff=lfs merge=lfs -text\nimg/*.jpg filter=lfs diff=lfs merge=lfs -text\n",
    "img/sub/a.png": "version https://git-lfs.github.com/spec/v1\n",
    "img/sub/b.jpg": "version https://git-lfs.github.com/spec/v1\n",
  });
  const res = audit(dir);
  rmSync(dir, { recursive: true, force: true });
  assert.strictEqual(res.ok, true);
});

test("t6 non-image binaries outside img/ ignored → pass", () => {
  const dir = initRepo({
    ".gitattributes":
      "img/*.png filter=lfs diff=lfs merge=lfs -text\nimg/*.jpg filter=lfs diff=lfs merge=lfs -text\n",
    "other/bad.png": "not a pointer\n",
  });
  const res = audit(dir);
  rmSync(dir, { recursive: true, force: true });
  assert.strictEqual(res.ok, true);
});

test("t7 LFS disabled clone detection works → pass", () => {
  const dir = initRepo({
    ".gitattributes":
      "img/*.png filter=lfs diff=lfs merge=lfs -text\nimg/*.jpg filter=lfs diff=lfs merge=lfs -text\n",
    "img/a.png": "version https://git-lfs.github.com/spec/v1\n",
  });
  writeFileSync(path.join(dir, "img/a.png"), "real binary\n");
  const res = audit(dir);
  rmSync(dir, { recursive: true, force: true });
  assert.strictEqual(res.ok, true);
});

test("t8 .gitattributes duplicate rules tolerated → pass", () => {
  const dir = initRepo({
    ".gitattributes":
      "img/*.png filter=lfs diff=lfs merge=lfs -text\nimg/*.png filter=lfs diff=lfs merge=lfs -text\nimg/*.jpg filter=lfs diff=lfs merge=lfs -text\n",
    "img/a.png": "version https://git-lfs.github.com/spec/v1\n",
  });
  const res = audit(dir);
  rmSync(dir, { recursive: true, force: true });
  assert.strictEqual(res.ok, true);
});

test("t9 Windows line endings in pointers tolerated → pass", () => {
  const dir = initRepo({
    ".gitattributes":
      "img/*.png filter=lfs diff=lfs merge=lfs -text\nimg/*.jpg filter=lfs diff=lfs merge=lfs -text\n",
    "img/a.png": "version https://git-lfs.github.com/spec/v1\r\n",
  });
  const res = audit(dir);
  rmSync(dir, { recursive: true, force: true });
  assert.strictEqual(res.ok, true);
});

test("t10 submodules ignored by default → pass", () => {
  const sub = initRepo({ "bad.png": "not a pointer\n" });
  const dir = mkdtempSync(path.join(tmpdir(), "lfs-audit-"));
  execFileSync("git", ["init"], { cwd: dir, stdio: "ignore" });
  writeFileSync(
    path.join(dir, ".gitattributes"),
    "img/*.png filter=lfs diff=lfs merge=lfs -text\nimg/*.jpg filter=lfs diff=lfs merge=lfs -text\n",
  );
  execFileSync("git", ["add", ".gitattributes"], { cwd: dir, stdio: "ignore" });
  execFileSync("git", ["commit", "-m", "init"], {
    cwd: dir,
    env: commitEnv(),
    stdio: "ignore",
  });
  execFileSync(
    "git",
    ["-c", "protocol.file.allow=always", "submodule", "add", sub, "img/sub"],
    { cwd: dir, stdio: "ignore" },
  );
  execFileSync("git", ["commit", "-am", "sub"], {
    cwd: dir,
    env: commitEnv(),
    stdio: "ignore",
  });
  const res = audit(dir);
  rmSync(dir, { recursive: true, force: true });
  rmSync(sub, { recursive: true, force: true });
  assert.strictEqual(res.ok, true);
});

test("t11 output includes exact offending paths", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "lfs-audit-"));
  execFileSync("git", ["init"], { cwd: dir, stdio: "ignore" });
  mkdirSync(path.join(dir, "img"), { recursive: true });
  writeFileSync(path.join(dir, "img/a.png"), "bad\n");
  writeFileSync(path.join(dir, "img/b.jpg"), "bad\n");
  execFileSync("git", ["add", "img/a.png", "img/b.jpg"], {
    cwd: dir,
    stdio: "ignore",
  });
  execFileSync("git", ["commit", "-m", "files"], {
    cwd: dir,
    env: commitEnv(),
    stdio: "ignore",
  });
  writeFileSync(
    path.join(dir, ".gitattributes"),
    "img/*.png filter=lfs diff=lfs merge=lfs -text\nimg/*.jpg filter=lfs diff=lfs merge lfs -text\n".replace(
      " merge lfs ",
      " merge=lfs ",
    ),
  );
  execFileSync("git", ["add", ".gitattributes"], { cwd: dir, stdio: "ignore" });
  execFileSync("git", ["commit", "-m", "attrs"], {
    cwd: dir,
    env: commitEnv(),
    stdio: "ignore",
  });
  const res = audit(dir);
  rmSync(dir, { recursive: true, force: true });
  assert.deepStrictEqual(res.offending, ["img/a.png", "img/b.jpg"]);
});

test("t12 summary JSON artifact with counts per pattern", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "lfs-audit-"));
  execFileSync("git", ["init"], { cwd: dir, stdio: "ignore" });
  mkdirSync(path.join(dir, "img"), { recursive: true });
  writeFileSync(path.join(dir, "img/a.png"), "bad\n");
  writeFileSync(
    path.join(dir, "img/b.jpg"),
    "version https://git-lfs.github.com/spec/v1\n",
  );
  execFileSync("git", ["add", "img/a.png", "img/b.jpg"], {
    cwd: dir,
    stdio: "ignore",
  });
  execFileSync("git", ["commit", "-m", "files"], {
    cwd: dir,
    env: commitEnv(),
    stdio: "ignore",
  });
  writeFileSync(
    path.join(dir, ".gitattributes"),
    "img/*.png filter=lfs diff=lfs merge=lfs -text\nimg/*.jpg filter=lfs diff=lfs merge lfs -text\n".replace(
      " merge lfs ",
      " merge=lfs ",
    ),
  );
  execFileSync("git", ["add", ".gitattributes"], { cwd: dir, stdio: "ignore" });
  execFileSync("git", ["commit", "-m", "attrs"], {
    cwd: dir,
    env: commitEnv(),
    stdio: "ignore",
  });
  const scriptSrc = execFileSync("cat", [
    path.resolve(
      __dirname,
      "../../../scripts/ci-guard/lfs-migrate-enforce/audit.ts",
    ),
  ]);
  writeFileSync(path.join(dir, "audit.ts"), scriptSrc);
  try {
    execFileSync("npx", ["-y", "tsx", "audit.ts"], {
      cwd: dir,
      stdio: "ignore",
    });
  } catch {
    /* ignore */
  }
  const json = JSON.parse(
    execFileSync(
      "cat",
      [path.join(dir, "ci-reports/lfs-migrate-enforce.json")],
      {
        encoding: "utf8",
      },
    ),
  );
  rmSync(dir, { recursive: true, force: true });
  assert.strictEqual(json.counts["img/*.png"], 1);
  assert.strictEqual(json.counts["img/*.jpg"], 0);
});
