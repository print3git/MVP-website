const { track } = require("../js/analytics.js");

beforeEach(() => {
  global.fetch = jest.fn(() => Promise.resolve({ ok: true }));
});

afterEach(() => {
  delete global.__TEST_HOOKS__;
  delete global.window;
  delete global.fetch;
});

test("track sends payload and invokes global hook", async () => {
  global.__TEST_HOOKS__ = { trackEvent: jest.fn() };
  await track("cart", { sessionId: "s1", modelId: "m1", subreddit: "funny" });
  expect(global.fetch).toHaveBeenCalledWith(
    expect.stringContaining("/api/track/cart"),
    expect.objectContaining({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "s1",
        modelId: "m1",
        subreddit: "funny",
      }),
    }),
  );
  expect(global.__TEST_HOOKS__.trackEvent).toHaveBeenCalledWith("cart", {
    sessionId: "s1",
    modelId: "m1",
    subreddit: "funny",
  });
});

test("track uses window hook when available", async () => {
  global.window = { __TEST_HOOKS__: { trackEvent: jest.fn(), API_ORIGIN: "" } };
  await track("share", { shareId: "sh1", network: "facebook" });
  expect(global.window.__TEST_HOOKS__.trackEvent).toHaveBeenCalledWith(
    "share",
    {
      shareId: "sh1",
      network: "facebook",
    },
  );
});
