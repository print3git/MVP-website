/** @jest-environment node */
jest.useFakeTimers();

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

let html = fs.readFileSync(path.join(__dirname, '../../../payment.html'), 'utf8');
html = html
  .replace(/<script[^>]+src="https?:\/\/[^>]+><\/script>/g, '')
  .replace(/<link[^>]+href="https?:\/\/[^>]+>/g, '')
  .replace(/<script[^>]+src="js\/modelViewerTouchFix.js"[^>]*><\/script>/, '');

function setupDom() {
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    resources: 'usable',
    url: 'http://localhost/',
  });
  global.window = dom.window;
  global.document = dom.window.document;
  const scriptSrc = fs.readFileSync(path.join(__dirname, '../../../js/payment.js'), 'utf8');
  dom.window.eval(scriptSrc);
  dom.window.setTimeout = setTimeout;
  dom.window.clearTimeout = clearTimeout;
  dom.window.setInterval = setInterval;
  dom.window.clearInterval = clearInterval;
  dom.window.Date = Date;
  return dom;
}

describe('flash banner', () => {
  test('hides after countdown ends', async () => {
    const dom = setupDom();
    dom.window.sessionStorage.setItem('flashDiscountShow', '1');
    dom.window.localStorage.setItem('flashDiscountEnd', String(Date.now() + 1000));
    dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
    dom.window.startFlashDiscount();
    const banner = dom.window.document.getElementById('flash-banner');
    expect(banner.hidden).toBe(false);

    await jest.runOnlyPendingTimersAsync();

    expect(banner.hidden).toBe(true);
    expect(dom.window.localStorage.getItem('flashDiscountEnd')).toBe('0');
  });

  test('does not restart after expiration', async () => {
    const dom = setupDom();
    dom.window.sessionStorage.setItem('flashDiscountShow', '1');
    dom.window.localStorage.setItem('flashDiscountEnd', '0');
    dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
    dom.window.startFlashDiscount();
    const end = dom.window.localStorage.getItem('flashDiscountEnd');
    expect(end).toBe('0');
    const banner = dom.window.document.getElementById('flash-banner');
    expect(banner.hidden).toBe(true);
  });

  test('countdown shows 4:59 after one second', async () => {
    const dom = setupDom();
    dom.window.sessionStorage.setItem('flashDiscountShow', '1');
    dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
    dom.window.startFlashDiscount();
    const timerEl = dom.window.document.getElementById('flash-timer');
    expect(timerEl.textContent).toBe('5:00');

    await jest.runOnlyPendingTimersAsync();

    expect(timerEl.textContent).toBe('4:59');
  });

  test('banner hidden when chance disabled', async () => {
    const dom = setupDom();
    dom.window.sessionStorage.setItem('flashDiscountShow', '0');
    dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
    dom.window.startFlashDiscount();
    const banner = dom.window.document.getElementById('flash-banner');
    expect(banner.hidden).toBe(true);
    expect(dom.window.localStorage.getItem('flashDiscountEnd')).toBe(null);
  });
});
