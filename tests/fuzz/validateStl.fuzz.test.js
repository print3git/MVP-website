const fs = require("fs");
const path = require("path");
const fc = require("fast-check");
const validateStl = require("../../backend/utils/validateStl");

describe("validateStl fuzz", () => {
  const dir = fs.mkdtempSync(path.join(__dirname, "stl-fuzz-"));
  afterAll(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test("does not throw on random data", () => {
    fc.assert(
      fc.property(fc.uint8Array(), (data) => {
        const file = path.join(dir, "file");
        fs.writeFileSync(file, Buffer.from(data));
        const result = validateStl(file);
        expect(typeof result).toBe("boolean");
      }),
      { numRuns: 50 },
    );
  });
});
