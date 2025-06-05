/** @jest-environment node */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

let html = '<div id="list"></div>';

describe('competitions page', () => {
  test('displays message when no competitions', async () => {
    const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable', url: 'http://localhost/' });
    global.window = dom.window;
    global.document = dom.window.document;
    const scriptSrc = fs.readFileSync(path.join(__dirname, '../../../js/competitions.js'), 'utf8');
    const fetchMock = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) }));
    dom.window.fetch = fetchMock;
    global.fetch = fetchMock;
    dom.window.eval(scriptSrc);
    dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
    await new Promise((r) => setTimeout(r, 0));
    expect(dom.window.document.getElementById('list').textContent).toContain('No active competitions');
  });
});
