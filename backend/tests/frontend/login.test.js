/** @jest-environment node */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

let dom;

let html = fs.readFileSync(path.join(__dirname, '../../../login.html'), 'utf8');
html = html
  .replace(/<script[^>]+tailwind[^>]*><\/script>/, '')
  .replace(/<link[^>]+font-awesome[^>]+>/, '');

describe('login form', () => {
  test('shows error on failed login', async () => {
    dom = new JSDOM(html, {
      runScripts: 'dangerously',
      resources: 'usable',
      url: 'http://localhost/login.html',
    });
    dom.window.document.querySelectorAll('script[src*="tailwind"]').forEach((s) => s.remove());
    global.window = dom.window;
    global.document = dom.window.document;
    const scriptSrc = fs.readFileSync(path.join(__dirname, '../../../js/login.js'), 'utf8');
    dom.window.eval(scriptSrc);
    // DOMContentLoaded has already fired in JSDOM when using runScripts,
    // so no need to wait for it here.
    const fetchMock = jest.fn(() => Promise.resolve({ json: () => ({ error: 'fail' }) }));
    dom.window.fetch = fetchMock;
    global.fetch = fetchMock;
    dom.window.document.getElementById('li-name').value = 'u';
    dom.window.document.getElementById('li-pass').value = 'p';
    dom.window.document.getElementById('loginForm').dispatchEvent(new dom.window.Event('submit'));
    await new Promise((r) => setTimeout(r, 0));
    expect(dom.window.document.getElementById('error').textContent).toBe('fail');
  });

  afterEach(() => {
    if (dom?.window) dom.window.close();
    delete global.window;
    delete global.document;
  });
});
