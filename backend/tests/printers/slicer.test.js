jest.mock("fs", () => ({ promises: { copyFile: jest.fn() } }));
const path = require("path");
const sliceModel = require("../../printers/slicer");
const fs = require("fs").promises;

test("copies model to gcode path", async () => {
  const out = await sliceModel("/tmp/model.stl", "/out");
  expect(fs.copyFile).toHaveBeenCalledWith(
    "/tmp/model.stl",
    path.join("/out", "model.gcode"),
  );
  expect(out).toBe(path.join("/out", "model.gcode"));
});
