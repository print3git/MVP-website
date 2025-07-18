/**
 * @jest-environment jsdom
 */
/* global localStorage */
const {
  addToBasket,
  removeFromBasket,
  clearBasket,
  getBasket,
  addAutoItem,
  manualizeItem,
} = require("../js/basket.js");

beforeEach(() => {
  localStorage.clear();
});

describe("basket add/remove", () => {
  for (let i = 0; i < 40; i++) {
    test(`add and remove ${i}`, () => {
      addToBasket({ jobId: i, modelUrl: `m${i}` });
      expect(getBasket()).toHaveLength(1);
      removeFromBasket(0);
      expect(getBasket()).toEqual([]);
    });
  }
});

describe("clear basket", () => {
  for (let i = 0; i < 40; i++) {
    test(`clear ${i}`, () => {
      addToBasket({ jobId: i });
      clearBasket();
      expect(getBasket()).toEqual([]);
    });
  }
});

describe("persist across reloads", () => {
  for (let i = 0; i < 40; i++) {
    test(`persist ${i}`, () => {
      addToBasket({ jobId: i });
      const stored = localStorage.getItem("print3Basket");
      expect(stored).toContain(`"jobId":${i}`);
    });
  }
});

describe("add auto item", () => {
  for (let i = 0; i < 40; i++) {
    test(`auto ${i}`, () => {
      addAutoItem({ jobId: i });
      expect(getBasket()[0]).toMatchObject({ jobId: i, auto: true });
    });
  }
});

describe("manualize item", () => {
  for (let i = 0; i < 40; i++) {
    test(`manualize ${i}`, () => {
      addAutoItem({ jobId: i });
      manualizeItem((it) => it.jobId === i);
      expect(getBasket()[0].auto).toBe(false);
    });
  }
});
