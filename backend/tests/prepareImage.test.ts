const fs = require("fs");
const path = require("path");

jest.mock("../src/lib/uploadS3", () => ({
  uploadFile: jest.fn().mockResolvedValue("https://cdn.test/image.png"),
}));

const { prepareImage } = require("../src/lib/prepareImage.ts");

describe("prepareImage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns http url unchanged", async () => {
    const url = await prepareImage("http://example.com/img.png");
    expect(url).toBe("http://example.com/img.png");
  });

  test("uploads existing local file", async () => {
    const tmp = path.join("/tmp", `test-${Date.now()}.png`);
    fs.writeFileSync(tmp, "data");
    const { uploadFile } = require("../src/lib/uploadS3");
    const url = await prepareImage(tmp);
    expect(uploadFile).toHaveBeenCalledWith(tmp, "image/png");
    expect(url).toBe("https://cdn.test/image.png");
    fs.unlinkSync(tmp);
  });

  test("uploads data url and cleans up", async () => {
    const data = Buffer.from("data").toString("base64");
    const dataURL = `data:image/png;base64,${data}`;
    const unlinkSpy = jest
      .spyOn(fs, "unlink")
      .mockImplementation((_, cb) => cb && cb());
    const { uploadFile } = require("../src/lib/uploadS3");
    const url = await prepareImage(dataURL);
    expect(uploadFile).toHaveBeenCalledWith(
      expect.stringMatching(/\/tmp\//),
      "image/png",
    );
    expect(url).toBe("https://cdn.test/image.png");
    expect(unlinkSpy).toHaveBeenCalled();
    unlinkSpy.mockRestore();
  });

  test("throws when file missing", async () => {
    await expect(prepareImage("/does/not/exist.png")).rejects.toThrow(
      "image file not found",
    );
  });

  test("rejects paths outside allowed dirs", async () => {
    await expect(prepareImage("/etc/passwd")).rejects.toThrow(
      "image file not found",
    );
    await expect(prepareImage("/tmp/../etc/passwd")).rejects.toThrow(
      "image file not found",
    );
    await expect(prepareImage("uploads/../secret.png")).rejects.toThrow(
      "image file not found",
    );
    await expect(prepareImage("/tmpstuff/evil.png")).rejects.toThrow(
      "image file not found",
    );
    await expect(prepareImage("uploadsbad/evil.png")).rejects.toThrow(
      "image file not found",
    );
  });
});
