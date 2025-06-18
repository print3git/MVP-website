const fs = require('fs');
const path = require('path');
const { parseDocument } = require('htmlparser2');

describe('HTML files parse', () => {
  const files = fs.readdirSync(path.join(__dirname, '../..')).filter((f) => f.endsWith('.html'));
  test.each(files)('%s parses', (file) => {
    const html = fs.readFileSync(path.join(__dirname, '../..', file), 'utf8');
    expect(() => parseDocument(html)).not.toThrow();
  });
});
