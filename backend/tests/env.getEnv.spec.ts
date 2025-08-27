describe('getEnv', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV } as NodeJS.ProcessEnv;
  });

  afterEach(() => {
    process.env = OLD_ENV;
    jest.restoreAllMocks();
  });

  test('allows optional vars in test env without warning', () => {
    process.env.NODE_ENV = 'test';
    process.env.DB_URL = 'postgres://user:pass@localhost/db';
    process.env.STRIPE_SECRET_KEY = 'sk';
    process.env.STRIPE_PUBLISHABLE_KEY = 'pk';
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { getEnv } = require('../src/env');
    expect(() => getEnv()).not.toThrow();
    expect(warn).not.toHaveBeenCalled();
  });

  test('warns but does not throw when optional vars missing in development', () => {
    process.env.NODE_ENV = 'development';
    process.env.DB_URL = 'postgres://user:pass@localhost/db';
    process.env.STRIPE_SECRET_KEY = 'sk';
    process.env.STRIPE_PUBLISHABLE_KEY = 'pk';
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { getEnv } = require('../src/env');
    expect(() => getEnv()).not.toThrow();
    expect(warn).toHaveBeenCalled();
  });

  test('throws when required vars missing', () => {
    process.env.NODE_ENV = 'test';
    delete process.env.DB_URL;
    process.env.STRIPE_SECRET_KEY = 'sk';
    process.env.STRIPE_PUBLISHABLE_KEY = 'pk';
    expect(() => require('../src/env')).toThrow(/DB_URL/);
  });
});

