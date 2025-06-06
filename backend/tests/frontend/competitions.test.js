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
    .replace(/document\.addEventListener\('DOMContentLoaded'[\s\S]+$/, '');
  script += '\nwindow.startCountdown = startCountdown;';
  dom.window.eval(script);
  const el = dom.window.document.getElementById('t');
  el.dataset.end = '2000-01-01';
  dom.window.startCountdown(el);
  expect(el.textContent).toBe('Closed');
});

test('startCountdown formats remaining time', () => {
  const dom = new JSDOM('<span id="t"></span>', { runScripts: 'dangerously' });
  global.window = dom.window;
  global.document = dom.window.document;
  let script = fs
    .readFileSync(path.join(__dirname, '../../../js/competitions.js'), 'utf8')
    .replace(/document\.addEventListener\('DOMContentLoaded'[\s\S]+$/, '');
  script += '\nwindow.startCountdown = startCountdown;';
  dom.window.eval(script);
  const el = dom.window.document.getElementById('t');
  const future = new Date(Date.now() + 2 * 86400000);
  el.dataset.end = future.toISOString().slice(0, 10);
  const now = new Date();
  const end = new Date(el.dataset.end + 'T23:59:59');
  const diff = end - now;
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const expected = `${d}d ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  dom.window.startCountdown(el);
  expect(el.textContent).toBe(expected);
});
