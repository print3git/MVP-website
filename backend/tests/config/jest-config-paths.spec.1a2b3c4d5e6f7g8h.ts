import fs from 'node:fs';
import path from 'node:path';

describe('jest config paths', () => {
  const config = require('../../jest.config.js');

  it('setupFilesAfterEnv paths exist', () => {
    const rootDir = path.resolve(__dirname, '../..');
    for (const p of config.setupFilesAfterEnv || []) {
      const resolved = p.replace('<rootDir>', rootDir);
      expect(fs.existsSync(resolved)).toBe(true);
    }
  });
});
