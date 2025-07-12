jest.mock("../src/lib/uploadS3.js", () => ({
  uploadFile: jest.fn(),
}));

const { uploadFile } = require("../src/lib/uploadS3.js");
const { textToImage } = require("../src/lib/textToImage.js");

test("uploadFile is mocked for textToImage", () => {
  expect(jest.isMockFunction(uploadFile)).toBe(true);
});
