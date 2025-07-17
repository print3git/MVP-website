const checkout = require("../backend/src/routes/checkout.js");

describe("checkout orders map store/get", () => {
  for (let i = 0; i < 100; i++) {
    test(`store and retrieve order ${i}`, () => {
      checkout.orders.clear();
      const id = "id" + i;
      const data = { slug: "slug" + i, email: "email" + i };
      checkout.orders.set(id, data);
      expect(checkout.orders.get(id)).toEqual(data);
    });
  }
});

describe("checkout orders map clear", () => {
  for (let i = 0; i < 100; i++) {
    test(`clear orders ${i}`, () => {
      checkout.orders.set("foo", { slug: "s", email: "e" });
      checkout.orders.clear();
      expect(checkout.orders.size).toBe(0);
    });
  }
});
