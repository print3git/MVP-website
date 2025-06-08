/** @jest-environment node */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

describe('shareOn', () => {
  function load() {
    const dom = new JSDOM('<!doctype html><html><body></body></html>', {
      runScripts: 'dangerously',
    });
    global.window = dom.window;
    global.document = dom.window.document;
    dom.window.navigator.share = undefined;
    dom.window.localStorage = { getItem: () => null };
    global.localStorage = dom.window.localStorage;
    let src = fs
      .readFileSync(path.join(__dirname, '../../../js/share.js'), 'utf8')
      .replace(/export \{[^}]+\};?/, '');
    dom.window.eval(src);
    return dom.window.shareOn;
  }

  const cases = [
    ['facebook', 'facebook.com'],
    ['twitter', 'twitter.com'],
    ['reddit', 'reddit.com'],
    ['linkedin', 'linkedin.com'],
    ['tiktok', 'tiktok.com'],
    ['instagram', 'instagram.com'],
  ];

  test.each(cases)('opens %s share URL', async (net, domain) => {
    const shareOn = load();
    global.window.open = jest.fn();
    await shareOn(net);
    expect(global.window.open).toHaveBeenCalledWith(
      expect.stringContaining(domain),
      '_blank',
      'noopener'
    );
  });
});
