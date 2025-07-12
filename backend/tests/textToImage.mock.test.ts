jest.mock("../src/lib/uploadS3", () => ({
  uploadFile: jest.fn(),
}));

describe("textToImage setup", () => {
  it("uses mocked uploadFile to avoid real AWS calls", () => {
    const s3 = require("../src/lib/uploadS3");
    expect(jest.isMockFunction(s3.uploadFile)).toBe(true);
  });
});
