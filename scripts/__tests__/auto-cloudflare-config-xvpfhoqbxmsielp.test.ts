import { jest } from '@jest/globals';
import path from 'path';

const mockFiles: Record<string, string> = {};

jest.mock('fs', () => ({
  readFileSync: jest.fn((p: string) => mockFiles[p]),
  writeFileSync: jest.fn((p: string, d: string) => {
    mockFiles[p] = d as string;
  }),
  existsSync: jest.fn((p: string) => Object.prototype.hasOwnProperty.call(mockFiles, p)),
}));

const SCRIPT = path.join('scripts', 'auto-cloudflare-config.ts');

beforeEach(() => {
  for (const key of Object.keys(mockFiles)) delete mockFiles[key];
  jest.resetModules();
});

test('adds buildCommand when framework detected', () => {
  mockFiles['package.json'] = JSON.stringify({ dependencies: { react: '^17.0.0' } });
  mockFiles['cfg.json'] = JSON.stringify({});
  process.argv = ['node', SCRIPT, 'cfg.json'];
  const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.isolateModules(() => {
    require('../auto-cloudflare-config.ts');
  });
  logSpy.mockRestore();
  expect(JSON.parse(mockFiles['cfg.json']).buildCommand).toBe('npm run build');
  const generated = Object.keys(mockFiles).find(f => f.startsWith('cloudflare-pages-config-') && f.endsWith('.ts'));
  expect(generated).toBeDefined();
});

test('handles missing config file gracefully', () => {
  mockFiles['package.json'] = JSON.stringify({});
  process.argv = ['node', SCRIPT, 'missing.json'];
  expect(() => {
    jest.isolateModules(() => {
      require('../auto-cloudflare-config.ts');
    });
  }).not.toThrow();
  expect(mockFiles['missing.json']).toBeDefined();
});

test('handles empty YAML config', () => {
  mockFiles['package.json'] = JSON.stringify({});
  mockFiles['file.yaml'] = '';
  process.argv = ['node', SCRIPT, 'file.yaml'];
  expect(() => {
    jest.isolateModules(() => {
      require('../auto-cloudflare-config.ts');
    });
  }).not.toThrow();
  expect(mockFiles['file.yaml']).toBeDefined();
});
