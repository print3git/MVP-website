/* eslint-disable jsdoc/check-tag-names */
/**
 * @jest-environment jsdom
 */
/* global localStorage */
const { authHeaders } = require("../js/api.js");
const { getBasket } = require("../js/basket.js");

describe("authHeaders empty", () => {
  beforeEach(() => localStorage.clear());
  for (let i = 0; i < 200; i++) {
    test(`empty ${i}`, () => {
      expect(authHeaders()).toEqual({});
    });
  }
});

describe("authHeaders token", () => {
  beforeEach(() => localStorage.clear());
  for (let i = 0; i < 200; i++) {
    test(`token ${i}`, () => {
      localStorage.setItem("token", "t");
      expect(authHeaders()).toEqual({ Authorization: "Bearer t" });
      localStorage.clear();
    });
  }
});

describe("getBasket empty", () => {
  for (let i = 0; i < 100; i++) {
    test(`empty ${i}`, () => {
      localStorage.clear();
      expect(getBasket()).toEqual([]);
    });
  }
});
