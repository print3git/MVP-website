let interval;
beforeAll(() => {
  interval = setInterval(() => {}, 1000);
});
afterAll(() => {
  if (interval) clearInterval(interval);
});
test("dummy", () => {
  expect(true).toBe(true);
});
