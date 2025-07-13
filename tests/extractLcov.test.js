const extractLcov = require("../scripts/extract-lcov");

describe("extract-lcov", () => {
  test("strips trailing logs", () => {
    const input = "ignored\nTN:\nSF:file.js\nDA:1,1\nend_of_record\nEXTRA\n";
    const output = extractLcov(input);
    expect(output).toBe("TN:\nSF:file.js\nDA:1,1\nend_of_record\n");
  });

  test("throws when missing markers", () => {
    expect(() => extractLcov("nope")).toThrow(/Failed to parse LCOV/);
  });
});
