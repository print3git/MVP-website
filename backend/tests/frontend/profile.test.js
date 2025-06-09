/** @jest-environment node */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

let dom;
afterEach(() => {
  if (dom?.window?.close) dom.window.close();
  delete global.window;
  delete global.document;
});

test('load displays models from API', async () => {
  dom = new JSDOM('<div id="models"></div>', {
    runScripts: 'dangerously',
    url: 'http://localhost/profile.html',
  });
  global.window = dom.window;
  global.document = dom.window.document;
  dom.window.captureSnapshots = () => {};
  let script = fs
    .readFileSync(path.join(__dirname, '../../../js/profile.js'), 'utf8')
    .replace(/import[^;]+;\n/, '');
  script += '\nwindow.loadProfile = load;';
  dom.window.eval(script);
  dom.window.localStorage.setItem('token', 't');
  dom.window.fetch = jest.fn(() =>
    Promise.resolve({
      json: () => [{ prompt: 'p', model_url: 'u', job_id: 'j', likes: 1 }],
    })
  );
  await dom.window.loadProfile();
  const children = dom.window.document.getElementById('models').children;
  expect(children.length).toBe(1);
  expect(children[0].classList.contains('model-card')).toBe(true);
  expect(children[0].dataset.model).toBe('u');
});
