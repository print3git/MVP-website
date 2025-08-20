type Server = import('http').Server;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const nock = require('nock');

interface GlobalWithResources {
  __servers?: Server[];
  __pgPools?: Array<{ end: () => Promise<unknown> }>;
  __redisClients?: Array<{
    quit?: () => Promise<unknown> | void;
    disconnect?: () => Promise<unknown> | void;
  }>;
  __cleanups?: Array<() => unknown | Promise<unknown>>;
}

const g = globalThis as GlobalWithResources;

declare function afterAll(fn: () => unknown | Promise<unknown>): void;

function registerServer(server: Server) {
  if (!g.__servers) g.__servers = [];
  g.__servers.push(server);
  return server;
}

function registerCleanup(fn: () => unknown | Promise<unknown>) {
  if (!g.__cleanups) g.__cleanups = [];
  g.__cleanups.push(fn);
  return fn;
}

// Initialize arrays if not already present
g.__servers = g.__servers || [];
g.__pgPools = g.__pgPools || [];
g.__redisClients = g.__redisClients || [];
g.__cleanups = g.__cleanups || [];

let mongoose: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  mongoose = require('mongoose');
} catch {
  mongoose = null;
}

afterAll(async () => {
  for (const server of g.__servers || []) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
  for (const pool of g.__pgPools || []) {
    if (typeof pool.end === 'function') await pool.end();
  }
  if (mongoose && mongoose.connection && mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  for (const client of g.__redisClients || []) {
    if (typeof client.quit === 'function') await client.quit();
    else if (typeof client.disconnect === 'function') await client.disconnect();
  }
  for (const fn of g.__cleanups || []) {
    await fn();
  }
  nock.cleanAll();
  nock.restore();
});

module.exports = { registerServer, registerCleanup };
