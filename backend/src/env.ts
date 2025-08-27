interface Env {
  DB_URL: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_PUBLISHABLE_KEY: string;
  NODE_ENV: string;
  AWS_REGION?: string;
  S3_BUCKET?: string;
  CLOUDFRONT_MODEL_DOMAIN?: string;
  PRINTER_API_URL?: string;
}

let cached: Readonly<Env> | undefined;

function isProd(): boolean {
  return process.env.NODE_ENV === 'production';
}

function shouldWarn(): boolean {
  return (
    process.env.NODE_ENV === 'development' &&
    process.env.QUIET_ENV_WARNINGS !== '1'
  );
}

function warn(msg: string): void {
  if (shouldWarn()) console.warn(msg);
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === '') {
    throw new Error(`${name} is required`);
  }
  return value;
}

function optionalEnv(name: string): string | undefined {
  const value = process.env[name];
  if (!value) {
    if (isProd()) {
      throw new Error(`${name} is required`);
    }
    warn(`${name} is not set`);
    return undefined;
  }
  return value;
}

export function getEnv(): Readonly<Env> {
  if (cached) return cached;
  const env: Env = {
    DB_URL: requireEnv('DB_URL'),
    STRIPE_SECRET_KEY: requireEnv('STRIPE_SECRET_KEY'),
    STRIPE_PUBLISHABLE_KEY: requireEnv('STRIPE_PUBLISHABLE_KEY'),
    NODE_ENV: requireEnv('NODE_ENV'),
    AWS_REGION: optionalEnv('AWS_REGION'),
    S3_BUCKET: optionalEnv('S3_BUCKET'),
    CLOUDFRONT_MODEL_DOMAIN: (() => {
      const val =
        process.env.CLOUDFRONT_MODEL_DOMAIN ||
        process.env.CLOUDFRONT_DOMAIN;
      if (!val) {
        if (isProd()) throw new Error('CLOUDFRONT_MODEL_DOMAIN is required');
        warn('CLOUDFRONT_MODEL_DOMAIN is not set');
        return undefined;
      }
      return val;
    })(),
    PRINTER_API_URL: optionalEnv('PRINTER_API_URL'),
  };
  cached = Object.freeze(env);
  return cached;
}

export type { Env };
