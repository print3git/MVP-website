/** @jest-environment node */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

let html = fs.readFileSync(path.join(__dirname, '../../../index.html'), 'utf8');
html = html
  .replace(/<script[^>]*src="https?:\/\/[^"']+"[^>]*>\s*<\/script>/g, '')
  .replace(/<link[^>]*href="https?:\/\/[^"']+"[^>]*>/g, '')
  .replace(/<script[^>]*src="js\/index.js"[^>]*>\s*<\/script>/, '');

describe('index page', () => {
  afterEach(() => {
    if (global.window) global.window.close();
    delete global.window;
    delete global.document;
    delete global.fetch;
    delete global.localStorage;
  });
  test('adds has-generated class when localStorage flag set', () => {
    const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable', url: 'http://localhost/' });
    global.window = dom.window;
    global.document = dom.window.document;
    dom.window.localStorage.setItem('hasGenerated', 'true');
    const scriptSrc = fs
      .readFileSync(path.join(__dirname, '../../../js/index.js'), 'utf8')
      .replace(/import[^\n]+share.js';?/, 'const shareOn = () => {};');
    dom.window.eval(scriptSrc);
    expect(dom.window.document.documentElement.classList.contains('has-generated')).toBe(true);
    dom.window.close();
  });

  test('sets prompt placeholder when no saved prompt', () => {
    const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable', url: 'http://localhost/' });
    global.window = dom.window;
    global.document = dom.window.document;
    const scriptSrc = fs
      .readFileSync(path.join(__dirname, '../../../js/index.js'), 'utf8')
      .replace(/import[^\n]+share.js';?/, 'const shareOn = () => {};');
    dom.window.eval(scriptSrc);
    dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
    const placeholder = dom.window.document.getElementById('promptInput').placeholder;
    expect(placeholder.length).toBeGreaterThan(0);
    dom.window.close();
  });
});
