const entryPoints = ["../../js/api.js", "../../js/index.js"];

describe("public SDK exports", () => {
  test("no generateModel symbol exported", () => {
    for (const ep of entryPoints) {
      const mod = require(ep);
      for (const key of Object.keys(mod)) {
        expect(/generateModel/i.test(key)).toBe(false);
      }
    }
  });
});
