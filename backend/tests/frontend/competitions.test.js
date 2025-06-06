/** @jest-environment node */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

test('startCountdown closes past competitions', () => {
  const dom = new JSDOM('<span id="t"></span>', { runScripts: 'dangerously' });
  global.window = dom.window;
  global.document = dom.window.document;
  let script = fs
    .readFileSync(path.join(__dirname, '../../../js/competitions.js'), 'utf8')
    .replace(/document\.addEventListener\('DOMContentLoaded'[\s\S]+$/, '')
    .replace(/const timer = setInterval/, 'var timer = setInterval');
  script += '\nwindow.startCountdown = startCountdown;';
  dom.window.eval(script);
  const el = dom.window.document.getElementById('t');
  el.dataset.end = '2000-01-01';
  dom.window.startCountdown(el);
  expect(el.textContent).toBe('Closed');
});
