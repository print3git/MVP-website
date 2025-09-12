const entryPoints = ["../../js/api.js", "../../js/index.js"];

describe("public SDK exports", () => {
  test("no generateModel symbol exported", () => {
    const loc = window.location;
    delete window.location;
    window.location = {
      ...loc,
      assign: jest.fn(),
      replace: jest.fn(),
      href: "http://example.com",
    };
    try {
      for (const ep of entryPoints) {
        const mod = require(ep);
        for (const key of Object.keys(mod)) {
          expect(/generateModel/i.test(key)).toBe(false);
        }
      }
    } finally {
      window.location = loc;
    }
  });
});
