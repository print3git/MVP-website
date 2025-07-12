const { orders } = require('../src/routes/checkout.js');

describe('checkout module', () => {
  test('exports orders map', () => {
    expect(orders).toBeInstanceOf(Map);
  });
});
