/** @jest-environment node */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

let html = fs.readFileSync(path.join(__dirname, '../../../payment.html'), 'utf8');
html = html.replace(/<script[^>]+src="https?:\/\/[^>]+><\/script>/g, '');

describe('flash banner', () => {
  test('hides after countdown ends', () => {
    jest.useFakeTimers();
    const dom = new JSDOM(html, {
      runScripts: 'dangerously',
      resources: 'usable',
      url: 'http://localhost/payment.html',
    });
    global.window = dom.window;
    global.document = dom.window.document;
    dom.window.localStorage.setItem('flashDiscountEnd', String(Date.now() + 1000));
    const scriptSrc = fs.readFileSync(path.join(__dirname, '../../../js/payment.js'), 'utf8');
    dom.window.eval(scriptSrc);
    dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
    const banner = dom.window.document.getElementById('flash-banner');
    expect(banner.hidden).toBe(false);
    jest.advanceTimersByTime(1100);
    expect(banner.hidden).toBe(true);
  });
});

