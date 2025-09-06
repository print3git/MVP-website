const sum = (a, b) => a + b;

test('auto discovery runs', () => {
  expect(sum(1, 2)).toBe(3);
});
