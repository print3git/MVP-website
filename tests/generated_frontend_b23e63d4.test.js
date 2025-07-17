/* eslint-disable jsdoc/check-tag-names */
/**
 * @jest-environment jsdom
 */
const { track } = require("../js/analytics.js");

describe("track bulk", () => {
  beforeEach(() => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: true }));
    global.window = {
      __TEST_HOOKS__: { trackEvent: jest.fn(), API_ORIGIN: "" },
    };
  });
  afterEach(() => {
    delete global.fetch;
    delete global.window;
  });
  for (let i = 0; i < 200; i++) {
    test(`send ${i}`, async () => {
      await track(`event${i}`, { i });
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/api/track/event${i}`),
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ i }),
        }),
      );
      expect(global.window.__TEST_HOOKS__.trackEvent).toHaveBeenCalledWith(
        `event${i}`,
        { i },
      );
    });
  }
});
