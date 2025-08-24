import path from 'path';

describe('jest config loads', () => {
  test('loads without throwing', () => {
    const configPath = path.resolve(__dirname, '..', '..', 'jest.config.js');
    let config: any;
    expect(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      config = require(configPath);
    }).not.toThrow();

    if (config.setupFilesAfterEnv !== undefined) {
      expect(Array.isArray(config.setupFilesAfterEnv)).toBe(true);
      for (const file of config.setupFilesAfterEnv) {
        expect(typeof file).toBe('string');
      }
    }

    if (config.testMatch !== undefined) {
      expect(Array.isArray(config.testMatch)).toBe(true);
      expect(config.testMatch.length).toBeGreaterThan(0);
    }
  });
});
