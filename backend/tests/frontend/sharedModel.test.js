/** @jest-environment node */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

function setup(url) {
  const dom = new JSDOM('<div id="viewer"></div><div id="error"></div>', {
    runScripts: 'dangerously',
    url,
  });
  global.window = dom.window;
  global.document = dom.window.document;
  const shareSrc = fs
    .readFileSync(path.join(__dirname, '../../../js/share.js'), 'utf8')
    .replace(/export \{[^}]+\};?/, '');
  dom.window.eval(shareSrc);
  let script = fs
    .readFileSync(path.join(__dirname, '../../../js/sharedModel.js'), 'utf8')
    .replace(/import { shareOn } from ['"]\.\/share.js['"];?/, '');
  dom.window.eval(script);
  return dom;
}

test('loads model from API', async () => {
  const dom = setup('http://localhost/share.html?slug=test');
  dom.window.fetch = jest.fn(() =>
    Promise.resolve({ ok: true, json: () => ({ model_url: 'foo.glb', snapshot: '/s.png' }) })
  );
  dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
  await new Promise((r) => setTimeout(r, 0));
  const viewer = dom.window.document.getElementById('viewer');
  expect(viewer.src).toContain('foo.glb');
  expect(viewer.getAttribute('poster')).toBe('/s.png');
});

test('shows error when slug missing', () => {
  const dom = setup('http://localhost/share.html');
  dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
  expect(dom.window.document.getElementById('error').textContent).toBe('Missing share link');
});
