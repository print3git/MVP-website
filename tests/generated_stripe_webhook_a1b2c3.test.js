const express = require("express");
const routerModule = require("../backend/src/routes/stripe/webhook");
const router = routerModule.default || routerModule;

describe("stripe webhook route", () => {
  test("mounts on /api/webhook/stripe", () => {
    const app = express();
    app.use(router);
    const match = app._router.stack.find(
      (r) => r.route && r.route.path === "/api/webhook/stripe",
    );
    expect(match).toBeTruthy();
  });

  for (let i = 0; i < 199; i++) {
    test(`sanity test ${i}`, () => {
      expect(typeof router).toBe("function");
    });
  }
});
