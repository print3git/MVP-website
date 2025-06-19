/** @jest-environment node */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

let html = fs.readFileSync(path.join(__dirname, '../../../payment.html'), 'utf8');
html = html
  .replace(/<script[^>]+src="https?:\/\/[^>]+><\/script>/g, '')
  .replace(/<link[^>]+href="https?:\/\/[^>]+>/g, '')
  .replace(/<script[^>]+src="js\/payment.js"[^>]*><\/script>/, '')
  .replace(/<script[^>]+src="js\/modelViewerTouchFix.js"[^>]*><\/script>/, '')
  .replace(/<script[^>]+src="js\/autoFullscreen.js"[^>]*><\/script>/, '');

function cycleKey() {
  const tz = 'America/New_York';
  const now = new Date();
  const df = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const tf = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', hour12: false });
  const date = df.format(now);
  const hour = parseInt(tf.format(now), 10);
  if (hour < 1) {
    const prev = new Date(now.getTime() - 86400000);
    return df.format(prev);
  }
  return date;
}

describe('slot count', () => {
  test('adjusts after purchase', async () => {
    const dom = new JSDOM(html, {
      runScripts: 'dangerously',
      resources: 'usable',
      url: 'http://localhost/payment.html?session_id=1',
    });
    global.window = dom.window;
    global.document = dom.window.document;
    dom.window.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => ({ slots: 5 }) }));
    const scriptSrc = fs.readFileSync(path.join(__dirname, '../../../js/payment.js'), 'utf8');
    dom.window.eval(scriptSrc);
    await new Promise((r) => setTimeout(r, 0));
    expect(dom.window.document.getElementById('slot-count').textContent).toBe('4');
    expect(dom.window.document.getElementById('bulk-slot-count').textContent).toBe('4');
    expect(dom.window.localStorage.getItem('slotPurchases')).toBe('1');
  });

  test('uses stored purchase count', async () => {
    const dom = new JSDOM(html, {
      runScripts: 'dangerously',
      resources: 'usable',
      url: 'http://localhost/payment.html',
    });
    global.window = dom.window;
    global.document = dom.window.document;
    dom.window.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => ({ slots: 6 }) }));
    const scriptSrc = fs.readFileSync(path.join(__dirname, '../../../js/payment.js'), 'utf8');
    dom.window.eval(scriptSrc);
    dom.window.localStorage.setItem('slotCycle', cycleKey());
    dom.window.localStorage.setItem('slotPurchases', '2');
    await new Promise((r) => setTimeout(r, 0));
    expect(dom.window.document.getElementById('slot-count').textContent).toBe('4');
    expect(dom.window.document.getElementById('bulk-slot-count').textContent).toBe('4');
  });
});
