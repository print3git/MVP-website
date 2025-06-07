/** @jest-environment node */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

let html = fs.readFileSync(path.join(__dirname, '../../../payment.html'), 'utf8');
html = html
  .replace(/<script[^>]+src="https?:\/\/[^>]+><\/script>/g, '')
  .replace(/<link[^>]+href="https?:\/\/[^>]+>/g, '');

describe('flash banner', () => {
  test('hides after countdown ends', async () => {
    const dom = new JSDOM(html, {
      runScripts: 'dangerously',
      resources: 'usable',
      url: 'http://localhost/',
    });
    global.window = dom.window;
    global.document = dom.window.document;
    dom.window.localStorage.setItem('flashDiscountEnd', String(Date.now() + 1000));
    const scriptSrc = fs.readFileSync(path.join(__dirname, '../../../js/payment.js'), 'utf8');
    dom.window.eval(scriptSrc);
    dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
    dom.window.startFlashDiscount();
    const banner = dom.window.document.getElementById('flash-banner');
    expect(banner.hidden).toBe(false);
    await new Promise((r) => setTimeout(r, 1100));
    expect(banner.hidden).toBe(true);
    expect(dom.window.localStorage.getItem('flashDiscountEnd')).toBe(null);
  });

  test('startFlashDiscount restarts expired timer', async () => {
    const dom = new JSDOM(html, {
      runScripts: 'dangerously',
      resources: 'usable',
      url: 'http://localhost/',
    });
    global.window = dom.window;
    global.document = dom.window.document;
    const expired = Date.now() - 1000;
    dom.window.localStorage.setItem('flashDiscountEnd', String(expired));
    const scriptSrc = fs.readFileSync(path.join(__dirname, '../../../js/payment.js'), 'utf8');
    dom.window.eval(scriptSrc);
    dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
    dom.window.startFlashDiscount();
    const end = Number(dom.window.localStorage.getItem('flashDiscountEnd'));
    expect(end).toBeGreaterThan(expired);
    const banner = dom.window.document.getElementById('flash-banner');
    expect(banner.hidden).toBe(false);
  });

  test('countdown shows 4:59 after one second', async () => {
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
    dom.window.startFlashDiscount();
    const timerEl = dom.window.document.getElementById('flash-timer');
    expect(timerEl.textContent).toBe('5:00');
    await new Promise((r) => setTimeout(r, 1100));
    expect(timerEl.textContent).toBe('4:59');
  });
});
