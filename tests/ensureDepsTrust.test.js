const fs = require("fs");
const child_process = require("child_process");

jest.mock("fs");

describe("ensure-deps mise trust", () => {
  beforeEach(() => {
    jest.resetModules();
    fs.existsSync.mockReturnValue(true);
    jest.spyOn(child_process, "execSync").mockReset();
  });

  test("calls mise trust on repo startup", () => {
    require("../backend/scripts/ensure-deps");
    const call = child_process.execSync.mock.calls.find((c) =>
      String(c[0]).includes("mise trust"),
    );
    expect(call).toBeDefined();
  });
});
