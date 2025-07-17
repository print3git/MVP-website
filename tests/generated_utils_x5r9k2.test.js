const fs = require("fs");
const path = require("path");
const validateStl = require("../backend/utils/validateStl");

describe("generated validateStl tests", () => {
  const tmp = fs.mkdtempSync(path.join(__dirname, "stl-"));

  afterAll(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  test("rejects random bytes", () => {
    const file = path.join(tmp, "random.bin");
    fs.writeFileSync(file, Buffer.from([1, 2, 3, 4]));
    expect(validateStl(file)).toBe(false);
  });

  test("accepts simple binary STL", () => {
    const file = path.join(tmp, "valid.stl");
    const buf = Buffer.alloc(84);
    buf.write("BIN", 0, "ascii");
    buf.writeUInt32LE(1, 80);
    fs.writeFileSync(file, buf);
    expect(validateStl(file)).toBe(true);
  });
});
