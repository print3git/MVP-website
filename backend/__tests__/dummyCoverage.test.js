const generateAdCopy = require("../utils/generateAdCopy.js");

it("generates ad copy string", async () => {
  const text = await generateAdCopy("example");
  expect(typeof text).toBe("string");
});
