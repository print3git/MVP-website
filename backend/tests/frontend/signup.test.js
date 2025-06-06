/** @jest-environment node */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

process.env.STRIPE_SECRET_KEY = 'test';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec';
process.env.DB_URL = 'postgres://user:pass@localhost/db';
process.env.HUNYUAN_API_KEY = 'test';
process.env.HUNYUAN_SERVER_URL = 'http://localhost:4000';

jest.mock('../../db', () => ({ query: jest.fn().mockResolvedValue({ rows: [] }) }));
jest.mock('../../mail', () => ({ sendMail: jest.fn() }));
const { sendMail } = require('../../mail');
const request = require('supertest');
const app = require('../../server');

let html = fs.readFileSync(path.join(__dirname, '../../../signup.html'), 'utf8');
html = html.replace(/<script[^>]+tailwind[^>]*><\/script>/, '');

describe('signup form', () => {
  test('shows error on failed signup', async () => {
    const dom = new JSDOM(html, {
      runScripts: 'dangerously',
      resources: 'usable',
      url: 'http://localhost/signup.html',
    });
    dom.window.document.querySelectorAll('script[src*="tailwind"]').forEach((s) => s.remove());
    global.window = dom.window;
    global.document = dom.window.document;
    const scriptSrc = fs
      .readFileSync(path.join(__dirname, '../../../js/signup.js'), 'utf8')
      .replace("window.location.href = 'profile.html';", '');
    dom.window.eval(scriptSrc);
    const fetchMock = jest.fn(() => Promise.resolve({ json: () => ({ error: 'fail' }) }));
    dom.window.fetch = fetchMock;
    global.fetch = fetchMock;
    dom.window.document.getElementById('su-name').value = 'u';
    dom.window.document.getElementById('su-email').value = 'e';
    dom.window.document.getElementById('su-pass').value = 'p';
    dom.window.document.getElementById('signupForm').dispatchEvent(new dom.window.Event('submit'));
    await new Promise((r) => setTimeout(r, 0));
    expect(dom.window.document.getElementById('error').textContent).toBe('fail');
  });

  test('opt-in generates confirmation email', async () => {
    const dom = new JSDOM(html, {
      runScripts: 'dangerously',
      resources: 'usable',
      url: 'http://localhost/signup.html',
    });
    dom.window.document.querySelectorAll('script[src*="tailwind"]').forEach((s) => s.remove());
    global.window = dom.window;
    global.document = dom.window.document;
    const scriptSrc = fs
      .readFileSync(path.join(__dirname, '../../../js/signup.js'), 'utf8')
      .replace("window.location.href = 'profile.html';", '');
    dom.window.eval(scriptSrc);

    global.fetch = dom.window.fetch = jest.fn((url, opts) => {
      if (url === '/api/register') {
        return Promise.resolve({ json: () => ({ token: 'tok' }) });
      }
      if (url === '/api/subscribe') {
        return request(app)
          .post('/api/subscribe')
          .set('origin', 'http://localhost')
          .send(JSON.parse(opts.body))
          .then(() => ({ json: () => ({}) }));
      }
      return Promise.resolve({ json: () => ({}) });
    });

    dom.window.document.getElementById('su-name').value = 'alice';
    dom.window.document.getElementById('su-email').value = 'a@a.com';
    dom.window.document.getElementById('su-pass').value = 'p';
    dom.window.document.getElementById('signup-mailing').checked = true;
    dom.window.document.getElementById('signupForm').dispatchEvent(new dom.window.Event('submit'));
    await new Promise((r) => setTimeout(r, 0));
    await Promise.all(global.fetch.mock.results.map((r) => r.value));

    expect(sendMail).toHaveBeenCalled();
    const msg = sendMail.mock.calls[0][2];
    const token = /token=([\w-]+)/.exec(msg)[1];
    const res = await request(app).get(`/api/confirm-subscription?token=${token}`);
    expect(res.text).toBe('Subscription confirmed');
  });
});
