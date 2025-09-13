import { buildDOM } from "./helpers/dom.js";
import { memoryStorage } from "./helpers/storage.js";
import { makeFetch } from "./helpers/fetch.js";

describe("basket server sync", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test("maps and merges server items", async () => {
    const dom = buildDOM(
      '<button id="basket-button"><span id="basket-count"></span></button><div id="basket-list"></div>',
    );
    global.window = dom.window;
    global.document = dom.window.document;
    const storage = memoryStorage({
      token: "t",
      print2Basket: JSON.stringify([{ jobId: "local", serverId: "s0" }]),
    });
    const fetchFn = makeFetch({
      "http://localhost/api/cart": {
        ok: true,
        body: {
          items: [
            {
              job_id: "j1",
              quantity: 2,
              id: "s1",
              model_url: "m1",
              snapshot: "snap1",
            },
          ],
        },
      },
    });
    const { createBasket } = await import("../js/basket.js");
    const basket = createBasket(storage, { fetchFn });
    await basket.syncServerCart();
    expect(basket.getBasket()).toEqual([
      {
        jobId: "j1",
        quantity: 2,
        serverId: "s1",
        modelUrl: "m1",
        snapshot: "snap1",
      },
    ]);
    const list = dom.window.document.getElementById("basket-list");
    expect(list.children.length).toBe(1);
    expect(dom.window.document.getElementById("basket-count").textContent).toBe(
      "1",
    );
    expect(storage.getItem("print2Basket")).toContain("j1");
    expect(storage.getItem("print2Basket")).not.toContain("local");
  });
});
