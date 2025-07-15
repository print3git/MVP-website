const axios = require("axios");
const dotenv = require("dotenv");
const forwarded = require("forwarded");

test("backend deps resolve", () => {
  expect(typeof axios).toBe("function");
  expect(typeof dotenv.config).toBe("function");
  expect(typeof forwarded).toBe("function");
});
