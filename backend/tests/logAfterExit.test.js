const { generateGlb } = require("../src/lib/sparc3dClient");

test("dummy", () => {
  expect(typeof generateGlb).toBe("function");
});

process.on("exit", () => {
  console.log("AFTER_EXIT");
});
