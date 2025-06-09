/** @jest-environment node */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

let html = fs.readFileSync(path.join(__dirname, '../../../payment.html'), 'utf8');
html = html
  .replace(/<script[^>]+src="https?:\/\/[^>]+><\/script>/g, '')
  .replace(/<link[^>]+href="https?:\/\/[^>]+>/g, '')
  .replace(/<script[^>]+src="js\/modelViewerTouchFix.js"[^>]*><\/script>/, '');

describe('exit overlay', () => {
  function setup() {
    const dom = new JSDOM(html, {
      runScripts: 'dangerously',
      resources: 'usable',
      url: 'http://localhost/',
    });
    global.window = dom.window;
    global.document = dom.window.document;
    const scriptSrc = fs.readFileSync(path.join(__dirname, '../../../js/payment.js'), 'utf8');
    dom.window.eval(scriptSrc);
    dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
    return dom;
  }

  test('shows when triggered', () => {
    const dom = setup();
    const overlay = dom.window.document.getElementById('exit-overlay');
    expect(overlay.classList.contains('hidden')).toBe(true);
    dom.window.triggerExitOverlay();
    expect(overlay.classList.contains('hidden')).toBe(false);
  });

  test('hides after countdown ends', async () => {
    const dom = setup();
    dom.window.localStorage.setItem('exitOfferEnd', String(Date.now() + 1000));
    dom.window.startExitOverlay();
    const overlay = dom.window.document.getElementById('exit-overlay');
    expect(overlay.classList.contains('hidden')).toBe(false);
    await new Promise((r) => setTimeout(r, 1100));
    expect(overlay.classList.contains('hidden')).toBe(true);
    expect(dom.window.localStorage.getItem('exitOfferEnd')).toBe('0');
  });
});
