const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  validate,
} = require("../../../scripts/ci-guard/lfs-prettier-guard/validate");

function tmpdir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "lpg-"));
}

function copy(src, dest) {
  const fullSrc = path.resolve(__dirname, "fixtures", src);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(fullSrc, dest);
}

describe("lfs-prettier-guard", () => {
  test("t1 valid repo passes", async () => {
    const dir = tmpdir();
    copy("valid-pointer.png", path.join(dir, "img", "a.png"));
    const res = await validate(dir);
    expect(res.ok).toBe(true);
  });

  test("t2 raw image fails", async () => {
    const dir = tmpdir();
    copy("raw-image.png", path.join(dir, "img", "bad.png"));
    const res = await validate(dir);
    expect(res.ok).toBe(false);
    expect(res.errors[0]).toMatch(/non-pointer asset/);
  });

  test("t3 mixed case extension", async () => {
    const dir = tmpdir();
    copy("valid-pointer.png", path.join(dir, "img", "a.PNG"));
    const res = await validate(dir);
    expect(res.ok).toBe(true);
  });

  test("t4 large jpg fails", async () => {
    const dir = tmpdir();
    const file = path.join(dir, "img", "big.jpg");
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, Buffer.alloc(6 * 1024 * 1024));
    const res = await validate(dir);
    expect(res.ok).toBe(false);
  });

  test("t5 prettier violation", async () => {
    const dir = tmpdir();
    copy("misformatted.js", path.join(dir, "a.js"));
    const res = await validate(dir);
    expect(res.ok).toBe(false);
    expect(res.errors[0]).toMatch(/prettier/);
    expect(res.errors[0]).toMatch(/\+/);
  });

  test("t6 yaml ignored", async () => {
    const dir = tmpdir();
    copy("bad.yml", path.join(dir, "bad.yml"));
    const res = await validate(dir);
    expect(res.ok).toBe(true);
  });

  test("t7 good json passes", async () => {
    const dir = tmpdir();
    copy("good.json", path.join(dir, "data.json"));
    const res = await validate(dir);
    expect(res.ok).toBe(true);
  });

  test("t8 bad json fails", async () => {
    const dir = tmpdir();
    copy("bad.json", path.join(dir, "data.json"));
    const res = await validate(dir);
    expect(res.ok).toBe(false);
    expect(res.errors[0]).toMatch(/\+/);
  });

  test("t9 markdown fails", async () => {
    const dir = tmpdir();
    copy("misformatted.md", path.join(dir, "readme.md"));
    const res = await validate(dir);
    expect(res.ok).toBe(false);
  });

  test("t10 all valid passes", async () => {
    const dir = tmpdir();
    copy("valid-pointer.png", path.join(dir, "img", "a.png"));
    copy("valid.js", path.join(dir, "a.js"));
    copy("good.json", path.join(dir, "data.json"));
    copy("valid.md", path.join(dir, "readme.md"));
    const res = await validate(dir);
    expect(res.ok).toBe(true);
  });

  test("t11 single line array triggers false positive", async () => {
    const dir = tmpdir();
    copy("single-line-array.json", path.join(dir, "data.json"));
    const res = await validate(dir);
    expect(res.ok).toBe(false);
    expect(res.errors[0]).toMatch(/prettier: data.json/);
    expect(res.errors[0]).toMatch(/\+\s+"config:base"/);
  });

  test("t12 node_modules ignored", async () => {
    const dir = tmpdir();
    copy("misformatted.js", path.join(dir, "node_modules", "bad.js"));
    const res = await validate(dir);
    expect(res.ok).toBe(true);
  });
});
