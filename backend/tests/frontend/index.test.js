/** @jest-environment node */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

let html = fs.readFileSync(path.join(__dirname, '../../../index.html'), 'utf8');
html = html
  .replace(/<script[^>]+src="https?:\/\/[^>]+><\/script>/g, '')
  .replace(/<link[^>]+href="https?:\/\/[^>]+>/g, '')
  .replace(/<script[^>]+src="js\/index.js"[^>]*><\/script>/, '');

describe('index validatePrompt', () => {
  function setup() {
    const dom = new JSDOM(html, {
      runScripts: 'dangerously',
      resources: 'usable',
      url: 'http://localhost/',
    });
    global.window = dom.window;
    global.document = dom.window.document;
    const shareSrc = fs
      .readFileSync(path.join(__dirname, '../../../js/share.js'), 'utf8')
      .replace(/export \{[^}]+\};?/, '');
    dom.window.eval(shareSrc);
    let script = fs
      .readFileSync(path.join(__dirname, '../../../js/index.js'), 'utf8')
      .replace("import { shareOn } from './share.js';", '')

      .replace(/window\.addEventListener\('DOMContentLoaded'[\s\S]+$/, '')
      .replace(/let savedProfile = null;\n?/, '');

    script += '\nwindow.validatePrompt = validatePrompt;';
    dom.window.eval(script);
    return dom;
  }

  test('rejects short prompt', () => {
    const dom = setup();
    const ok = dom.window.validatePrompt('abc');
    expect(ok).toBe(false);
    expect(dom.window.document.getElementById('gen-error').textContent).toBe(
      'Prompt must be at least 5 characters'
    );
  });

  test('accepts valid prompt', () => {
    const dom = setup();
    const ok = dom.window.validatePrompt('hello world');
    expect(ok).toBe(true);
    expect(dom.window.document.getElementById('gen-error').textContent).toBe('');
  });

  test('rejects empty prompt without images', () => {
    const dom = setup();
    dom.window.uploadedFiles = [];
    const ok = dom.window.validatePrompt('');
    expect(ok).toBe(false);
    expect(dom.window.document.getElementById('gen-error').textContent).toBe(
      'Enter a prompt or upload images'
    );
  });

  test('rejects prompts with line breaks', () => {
    const dom = setup();
    const ok = dom.window.validatePrompt('line1\nline2');
    expect(ok).toBe(false);
    expect(dom.window.document.getElementById('gen-error').textContent).toBe(
      'Prompt cannot contain line breaks'
    );
  });

  test('rejects prompts with angle brackets', () => {
    const dom = setup();
    const ok = dom.window.validatePrompt('hello <world>');
    expect(ok).toBe(false);
    expect(dom.window.document.getElementById('gen-error').textContent).toBe(
      'Prompt contains invalid characters'
    );
  });

  test('rejects overly long prompts', () => {
    const dom = setup();
    const longPrompt = 'a'.repeat(201);
    const ok = dom.window.validatePrompt(longPrompt);
    expect(ok).toBe(false);
    expect(dom.window.document.getElementById('gen-error').textContent).toBe(
      'Prompt must be under 200 characters'
    );
  });
});
