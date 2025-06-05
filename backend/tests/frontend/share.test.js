/** @jest-environment node */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const scriptSrc = fs
  .readFileSync(path.join(__dirname, '../../../js/share.js'), 'utf8')
  .replace(/export\s+\{[^}]+\};?/, '') + '\nwindow.shareOn = shareOn;';

describe('shareOn', () => {
  test('opens twitter share url', () => {
    const dom = new JSDOM('', { url: 'http://example.com' });
    global.window = dom.window;
    global.document = dom.window.document;
    const openMock = jest.fn();
    dom.window.open = openMock;
    dom.window.eval(scriptSrc);
    dom.window.shareOn('twitter');
    expect(openMock).toHaveBeenCalledWith(
      expect.stringContaining('twitter.com/intent/tweet'),
      '_blank',
      'noopener'
    );
    dom.window.close();
  });
});
