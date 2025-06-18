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
    .replace(/import[^;]+;\n/, '')
    .replace(/document\.addEventListener\('DOMContentLoaded'[\s\S]+$/, '');
  script += '\nwindow.startCountdown = startCountdown;';
  dom.window.eval(script);
  const el = dom.window.document.getElementById('t');
  el.dataset.deadline = '2000-01-01T23:59:59.000Z';
  dom.window.startCountdown(el);
  expect(el.textContent).toBe('Closed');
});

test('startCountdown formats remaining time', () => {
  const dom = new JSDOM('<span id="t"></span>', { runScripts: 'dangerously' });
  global.window = dom.window;
  global.document = dom.window.document;
  let script = fs
    .readFileSync(path.join(__dirname, '../../../js/competitions.js'), 'utf8')
    .replace(/import[^;]+;\n/, '')
    .replace(/document\.addEventListener\('DOMContentLoaded'[\s\S]+$/, '');
  script += '\nwindow.startCountdown = startCountdown;';
  dom.window.eval(script);
  const el = dom.window.document.getElementById('t');
  const future = new Date(Date.now() + 2 * 86400000 + 31 * 60000 + 5 * 1000);
  el.dataset.deadline = future.toISOString();
  dom.window.startCountdown(el);
  const now = new Date();

  let diff = new Date(el.dataset.deadline) - now;
  let remaining = Math.round(diff / 1000);
  const d = Math.floor(remaining / 86400);
  remaining %= 86400;
  const h = Math.floor(remaining / 3600);
  remaining %= 3600;
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  const expected = `${d}d ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  expect(el.textContent).toBe(expected);
});
