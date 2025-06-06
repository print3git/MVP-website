/** @jest-environment node */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

let html = fs.readFileSync(path.join(__dirname, '../../../profile.html'), 'utf8');
html = html
  .replace(/<script[^>]*src="https?:\/\/[^"']+"[^>]*>\s*<\/script>/g, '')
  .replace(/<script[^>]*src="js\/profile.js"[^>]*>\s*<\/script>/, '');

describe('profile page', () => {
  afterEach(() => {
    if (global.window) global.window.close();
    delete global.window;
    delete global.document;
    delete global.fetch;
  });
  test('redirects to login when no token', () => {
    const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable', url: 'http://localhost/profile.html' });
    global.window = dom.window;
    global.document = dom.window.document;
    const scriptSrc = fs
      .readFileSync(path.join(__dirname, '../../../js/profile.js'), 'utf8')
      .replace("window.location.href = 'login.html';", "window._testRedirect = 'login.html';");
    dom.window.eval(scriptSrc);
    dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
    expect(dom.window._testRedirect).toBe('login.html');
    dom.window.close();
  });
});
