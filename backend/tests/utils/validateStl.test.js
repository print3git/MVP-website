const fs = require("fs");
const path = require("path");
const validateStl = require("../../utils/validateStl");

describe("validateStl", () => {
  const tmpDir = fs.mkdtempSync(path.join(__dirname, "stl-"));

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("returns true for valid ASCII STL", () => {
    const file = path.join(tmpDir, "model_ascii.stl");
    const ascii = `solid test\nfacet normal 0 0 0\nouter loop\nvertex 0 0 0\nvertex 1 0 0\nvertex 0 1 0\nendloop\nendfacet\nendsolid test`;
    fs.writeFileSync(file, ascii);
    expect(validateStl(file)).toBe(true);
  });

  test("returns true for valid binary STL", () => {
    const file = path.join(tmpDir, "model_bin.stl");
    const buf = Buffer.alloc(84);
    buf.write("BINARY", 0, "ascii");
    buf.writeUInt32LE(1, 80);
    fs.writeFileSync(file, buf);
    expect(validateStl(file)).toBe(true);
  });

  test("returns false for ascii missing endsolid", () => {
    const file = path.join(tmpDir, "bad_ascii.stl");
    fs.writeFileSync(file, "solid test\nendsolid");
    expect(validateStl(file)).toBe(false);
  });

  test("returns false for binary with zero tri", () => {
    const file = path.join(tmpDir, "bad_bin.stl");
    const buf = Buffer.alloc(84);
    buf.write("BINARY", 0, "ascii");
    buf.writeUInt32LE(0, 80);
    fs.writeFileSync(file, buf);
    expect(validateStl(file)).toBe(false);
  });

  test("returns false for invalid file", () => {
    const file = path.join(tmpDir, "invalid.stl");
    fs.writeFileSync(file, "bad");
    expect(validateStl(file)).toBe(false);
  });

  test("returns false when file missing", () => {
    const file = path.join(tmpDir, "missing.stl");
    expect(validateStl(file)).toBe(false);
  });
});
