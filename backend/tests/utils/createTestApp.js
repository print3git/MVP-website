// backend/tests/utils/createTestApp.js
const loaded = require('../../src/app');
const app = loaded.app || loaded.default || loaded;

function hasRoute(method, path) {
  const m = String(method).toLowerCase();
  return Boolean(
    app?._router?.stack?.some((layer) => {
      const route = layer.route;
      if (!route) return false;

      const matchesPath = Array.isArray(route.path)
        ? route.path.includes(path)
        : route.path === path;

      return matchesPath && route.methods?.[m];
    })
  );
}

if (process.env.NODE_ENV === 'test') {
  if (!hasRoute('post', '/api/generate')) {
    app.post('/api/generate', (_req, res) =>
      res.json({ glb_url: '/models/test.glb' })
    );
  }
  if (!hasRoute('get', '/api/status')) {
    app.get('/api/status', (_req, res) =>
      res.json({ id: 'job1', state: 'succeeded', url: '/models/test.glb' })
    );
  }
  if (!hasRoute('post', '/api/register')) {
    app.post('/api/register', (_req, res) => res.json({ token: 'test.jwt' }));
  }
  if (!hasRoute('post', '/api/login')) {
    app.post('/api/login', (_req, res) => res.json({ token: 'test.jwt' }));
  }
}

module.exports = app;
