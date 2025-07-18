const fs = require("fs");
const { tmpdir } = require("os");

const before = new Set(fs.readdirSync(tmpdir()));

function delay(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

test("temp files cleaned after glb generation", async () => {
  jest.useFakeTimers();
  await jest.isolateModulesAsync(async () => {
    jest.doMock("../backend/src/lib/prepareImage", () => ({
      prepareImage: jest.fn().mockResolvedValue("http://img"),
    }));
    jest.doMock("../backend/src/lib/textToImage", () => ({
      textToImage: jest.fn().mockResolvedValue("http://img"),
    }));
    jest.doMock("../backend/src/lib/imageToText", () => ({
      imageToText: jest.fn().mockResolvedValue("prompt"),
    }));
    jest.doMock("../backend/src/lib/sparc3dClient", () => ({
      generateGlb: jest.fn().mockResolvedValue(Buffer.from("glTF1234")),
    }));
    jest.doMock("../backend/src/lib/preserveColors", () => ({
      preserveColors: jest.fn(async (b) => b),
    }));
    jest.doMock("../backend/src/lib/storeGlb", () => ({
      storeGlb: jest.fn().mockResolvedValue("https://cdn/model.glb"),
    }));
    const { generateModel } = require("../backend/src/pipeline/generateModel");
    await generateModel({ prompt: "cleanup" });
  });
  jest.advanceTimersByTime(60_000);
  await delay(0); // flush timers
  const after = fs.readdirSync(tmpdir());
  jest.useRealTimers();
  for (const f of after) {
    if (!before.has(f) && (f.endsWith(".glb") || f.endsWith(".png"))) {
      throw new Error(`Stale file: ${f}`);
    }
  }
});
