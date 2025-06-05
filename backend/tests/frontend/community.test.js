/** @jest-environment node */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

describe('community like', () => {
  test('sends like request with auth header', async () => {
    const dom = new JSDOM('<span id="likes-1"></span>', { url: 'http://localhost/' });
    global.window = dom.window;
    global.document = dom.window.document;
    global.localStorage = dom.window.localStorage;
    localStorage.setItem('token', 'abc');
    const scriptSrc = fs
      .readFileSync(path.join(__dirname, '../../../js/community.js'), 'utf8')
      .replace(/export\s+\{[^}]+\};?/, '') + '\nwindow.like = like;';
    const fetchMock = jest.fn(() => Promise.resolve({ json: () => Promise.resolve({ likes: 3 }) }));
    dom.window.fetch = fetchMock;
    global.fetch = fetchMock;
    dom.window.eval(scriptSrc);
    dom.window.like(1);
    await new Promise((r) => setTimeout(r, 0));
    expect(fetchMock).toHaveBeenCalledWith('/api/models/1/like', expect.objectContaining({ headers: { Authorization: 'Bearer abc' } }));
    expect(dom.window.document.querySelector('#likes-1').textContent).toBe('3');
    dom.window.close();
  });
});
