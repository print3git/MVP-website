describe("computeDailyPrintsSold", () => {
  let originalCrypto;
  beforeEach(() => {
    jest.resetModules();
    originalCrypto = global.crypto;
  });
  afterEach(() => {
    global.crypto = originalCrypto;
  });

  test("uses crypto digest when available", async () => {
    const buffer = new ArrayBuffer(4);
    new DataView(buffer).setUint32(0, 0x12345678);
    global.crypto = { subtle: { digest: jest.fn().mockResolvedValue(buffer) } };
    const { computeDailyPrintsSold } = await import("../js/index.js");
    const date = new Date("2025-01-02T00:00:00Z");
    const prints = await computeDailyPrintsSold(date);
    const int = 0x12345678;
    const expected = Math.floor((int / 0xffffffff) * (50 - 30 + 1)) + 30;
    expect(prints).toBe(expected);
  });

  test("falls back when crypto digest missing", async () => {
    global.crypto = {};
    const { computeDailyPrintsSold } = await import("../js/index.js");
    const date = new Date("2025-01-02T00:00:00Z");
    const prints = await computeDailyPrintsSold(date);
    const eastern = new Date(
      date.toLocaleString("en-US", { timeZone: "America/New_York" }),
    )
      .toISOString()
      .slice(0, 10);
    let int = 0;
    for (let i = 0; i < eastern.length; i++) {
      int = (int * 31 + eastern.charCodeAt(i)) >>> 0;
    }
    const expected = Math.floor((int / 0xffffffff) * (50 - 30 + 1)) + 30;
    expect(prints).toBe(expected);
  });
});
