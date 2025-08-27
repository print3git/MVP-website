import { getEnv } from '../src/env';

describe('getEnv', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV } as NodeJS.ProcessEnv;
    delete require.cache[require.resolve('../src/env')];
  });

  afterEach(() => {
    process.env = OLD_ENV;
    jest.restoreAllMocks();
  });

  test('does not warn in test env', () => {
    process.env.NODE_ENV = 'test';
    process.env.DB_URL = 'postgres://user:pass@localhost/db';
    process.env.STRIPE_SECRET_KEY = 'sk';
    process.env.STRIPE_PUBLISHABLE_KEY = 'pk';
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    getEnv();
    expect(warn).not.toHaveBeenCalled();
  });

  test('throws when required vars missing', () => {
    process.env.NODE_ENV = 'test';
    delete process.env.DB_URL;
    process.env.STRIPE_SECRET_KEY = 'sk';
    process.env.STRIPE_PUBLISHABLE_KEY = 'pk';
    expect(() => getEnv()).toThrow(/DB_URL/);
  });
});
