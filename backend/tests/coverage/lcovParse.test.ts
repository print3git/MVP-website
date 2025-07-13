import parse = require('lcov-parse');

describe('lcovParse error handling', () => {
  test('rejects empty string', done => {
    parse('', (err, data) => {
      expect(err).toBeTruthy();
      expect(data).toBeUndefined();
      done();
    });
  });

  test('rejects malformed LCOV data', done => {
    const invalid = 'SF:file.js\nDA:1,1\n'; // missing end_of_record
    parse(invalid, (err, data) => {
      expect(err).toBeTruthy();
      expect(data).toBeUndefined();
      done();
    });
  });
});
