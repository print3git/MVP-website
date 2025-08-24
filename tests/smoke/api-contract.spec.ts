const fs = require('fs');
const path = require('path');
const yaml = require('yaml');

test('OpenAPI spec loads and has paths', () => {
  const candidates = [
    'openapi.yaml',
    'openapi.yml',
    'openapi.json',
    path.join('docs', 'openapi.yaml'),
    path.join('docs', 'openapi.yml'),
    path.join('docs', 'openapi.json'),
  ];
  const specPath = candidates.find((p) => fs.existsSync(p));
  if (!specPath) {
    console.warn('OpenAPI spec not found, skipping');
    return;
  }
  const content = fs.readFileSync(specPath, 'utf8');
  const spec = specPath.endsWith('.json') ? JSON.parse(content) : yaml.parse(content);
  expect(spec && spec.paths && Object.keys(spec.paths).length).toBeGreaterThan(0);
  expect(Object.keys(spec.paths)).not.toContain('/api/generate-model');
});
