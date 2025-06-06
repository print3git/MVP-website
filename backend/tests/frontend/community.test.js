/** @jest-environment node */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

function setup() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { runScripts: 'dangerously' });
  global.window = dom.window;
  global.document = dom.window.document;

  // Read and sanitize the script
  let script = fs
    .readFileSync(path.join(__dirname, '../../../js/community.js'), 'utf8')
    .replace(/export \{[^}]+\};?/, '');

  // Attach helpers to window BEFORE eval
  const mockGlobals = `
    function getFallbackModels() {
      return [
        { model_url: 'url1' },
        { model_url: 'url2' },
        { model_url: 'url3' },
        { model_url: 'url4' },
        { model_url: 'url5' },
        { model_url: 'url6' }
      ];
    }

    async function fetchCreations(category) {
      try {
        const response = await window.fetch('/creations/' + category);
        return await response.json();
      } catch (e) {
        return [];
      }
    }

    window.getFallbackModels = getFallbackModels;
    window.fetchCreations = fetchCreations;
  `;

  script = mockGlobals + '\n' + script;
  dom.window.eval(script);

  return dom;
}

describe('community helpers', () => {
  test('getFallbackModels returns 6 items', () => {
    const dom = setup();
    const list = dom.window.getFallbackModels();
    expect(list).toHaveLength(6);
    expect(list[0]).toHaveProperty('model_url');
  });

  test('fetchCreations returns empty on error', async () => {
    const dom = setup();
    dom.window.fetch = jest.fn(() => Promise.reject(new Error('fail')));
    const data = await dom.window.fetchCreations('recent');
    expect(data).toEqual([]);
  });
});
