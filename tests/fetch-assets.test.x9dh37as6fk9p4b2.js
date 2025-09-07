
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const { join } = require("node:path");
const os = require("node:os");
const http = require("node:http");

async function inTempDir(fn) {
  const dir = await fsp.mkdtemp(join(os.tmpdir(), "fa-"));
  const prev = process.cwd();
  process.chdir(dir);
  try {
    await fn(dir);
  } finally {
    process.chdir(prev);
    delete process.env.ASTRONAUT_MODEL_URL;
    delete process.env.BOOMBOX_MODEL_URL;
  }
}

async function startServer(handler) {
  const server = http.createServer(handler);
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();
  return { server, url: `http://127.0.0.1:${port}` };
}

function loadModule() {
  delete require.cache[require.resolve("../scripts/fetch-assets.cjs")];
  return require("../scripts/fetch-assets.cjs");
}

test("ensureDir creates directory", { concurrency: false }, async () => {
  await inTempDir(async (dir) => {
    const { ensureDir } = loadModule();
    const file = join(dir, "a/b/c.txt");
    await ensureDir(file);
    assert.ok(fs.existsSync(join(dir, "a/b")));
  });
});

test("download saves file", { concurrency: false }, async () => {
  await inTempDir(async (dir) => {
    const { download } = loadModule();
    const body = Buffer.from("hello");
    const { server, url } = await startServer((req, res) => {
      res.writeHead(200, { "Content-Length": body.length });
      res.end(body);
    });
    const dest = join(dir, "file.bin");
    await download(url, dest);
    const data = await fsp.readFile(dest);
    assert.deepEqual(data, body);
    server.close();
  });
});

test("download throws on http error", { concurrency: false }, async () => {
  await inTempDir(async (dir) => {
    const { download } = loadModule();
    const { server, url } = await startServer((req, res) => {
      res.writeHead(500);

      res.end("fail");
    });
    await assert.rejects(() => download(url, join(dir, "file")), /HTTP 500/);
    server.close();
  });
});


test(
  "fetchBoombox creates placeholder when URL missing",
  { concurrency: false },
  async () => {
    await inTempDir(async (dir) => {
      const { fetchBoombox } = loadModule();
      await fetchBoombox();
      const dest = join(dir, "frontend", "public", "models", "boombox.glb");
      const stats = await fsp.stat(dest);
      assert.equal(stats.size, 0);
    });
  },
);

test("fetchBoombox downloads model", { concurrency: false }, async () => {
  await inTempDir(async (dir) => {
    const { fetchBoombox } = loadModule();
    const body = Buffer.from("boom");
    const { server, url } = await startServer((req, res) => {
      res.writeHead(200, { "Content-Length": body.length });
      res.end(body);
    });
    process.env.BOOMBOX_MODEL_URL = url;
    await fetchBoombox();
    const dest = join(dir, "frontend", "public", "models", "boombox.glb");
    const data = await fsp.readFile(dest);
    assert.deepEqual(data, body);
    server.close();
  });
});


test(
  "fetchAstronaut throws when URL missing",
  { concurrency: false },
  async () => {
    await inTempDir(async () => {
      const { fetchAstronaut } = loadModule();
      await assert.rejects(fetchAstronaut, /ASTRONAUT_MODEL_URL not set/);
    });
  },
);

test("fetchAstronaut downloads file", { concurrency: false }, async () => {
  await inTempDir(async (dir) => {
    const { fetchAstronaut } = loadModule();
    const body = Buffer.from("astro");
    const { server, url } = await startServer((req, res) => {
      res.writeHead(200, { "Content-Length": body.length });
      res.end(body);
    });
    process.env.ASTRONAUT_MODEL_URL = url;
    const dest = await fetchAstronaut();
    const data = await fsp.readFile(dest);
    assert.deepEqual(data, body);
    server.close();
  });
});


test(
  "fetchAstronaut retries on incomplete response and succeeds",
  { concurrency: false },
  async () => {
    await inTempDir(async (dir) => {
      const { fetchAstronaut } = loadModule();
      const body = Buffer.from("astro");
      let count = 0;
      const { server, url } = await startServer((req, res) => {
        res.writeHead(200, { "Content-Length": body.length });
        if (count++ === 0) {
          res.end(body.slice(0, body.length - 1));
        } else {
          res.end(body);
        }
      });
      process.env.ASTRONAUT_MODEL_URL = url;
      const dest = await fetchAstronaut();
      const data = await fsp.readFile(dest);
      assert.deepEqual(data, body);
      assert.equal(count, 2);
      server.close();
    });
  },
);

test("fetchAstronaut fails after retries", { concurrency: false }, async () => {
  await inTempDir(async () => {
    const { fetchAstronaut } = loadModule();
    const body = Buffer.from("astro");
    const { server, url } = await startServer((req, res) => {
      res.writeHead(200, { "Content-Length": body.length });
      res.end(body.slice(0, body.length - 1));
    });
    process.env.ASTRONAUT_MODEL_URL = url;
    await assert.rejects(fetchAstronaut, /(incomplete response|terminated)/);
    server.close();
  });
});

test(
  "fetchAstronaut uses cached file on second call",
  { concurrency: false },
  async () => {
    await inTempDir(async (dir) => {
      const mod = loadModule();
      const body = Buffer.from("astro");
      let count = 0;
      const { server, url } = await startServer((req, res) => {
        count += 1;
        res.writeHead(200, { "Content-Length": body.length });
        res.end(body);
      });
      process.env.ASTRONAUT_MODEL_URL = url;
      const dest1 = await mod.fetchAstronaut();
      const dest2 = await mod.fetchAstronaut();
      assert.equal(dest1, dest2);
      assert.equal(count, 1);
      server.close();
    });
  },
);

test("ensureDir no-op on existing path", { concurrency: false }, async () => {
  await inTempDir(async (dir) => {
    const { ensureDir } = loadModule();
    const file = join(dir, "a.txt");
    await ensureDir(file);
    await ensureDir(file);
    assert.ok(fs.existsSync(dir));
  });
});

test(
  "download creates nested directories",
  { concurrency: false },
  async () => {
    await inTempDir(async (dir) => {
      const { download } = loadModule();
      const body = Buffer.from("hi");
      const { server, url } = await startServer((req, res) => {
        res.writeHead(200, { "Content-Length": body.length });
        res.end(body);
      });
      const dest = join(dir, "nested/dir/file.bin");
      await download(url, dest);
      const data = await fsp.readFile(dest);
      assert.deepEqual(data, body);
      server.close();
    });
  },
);

test(
  "download succeeds without Content-Length",
  { concurrency: false },
  async () => {
    await inTempDir(async (dir) => {
      const { download } = loadModule();
      const body = Buffer.from("hi");
      const { server, url } = await startServer((req, res) => {
        res.writeHead(200);
        res.end(body);
      });
      const dest = join(dir, "file.bin");
      await download(url, dest);
      const data = await fsp.readFile(dest);
      assert.deepEqual(data, body);
      server.close();
    });
  },
);

test("download fails on premature end", { concurrency: false }, async () => {
  await inTempDir(async (dir) => {
    const { download } = loadModule();
    const body = Buffer.from("hello");
    const { server, url } = await startServer((req, res) => {
      res.writeHead(200, { "Content-Length": body.length });
      res.end(body.slice(0, body.length - 1));
    });
    const dest = join(dir, "file.bin");
    await assert.rejects(() => download(url, dest), /(incomplete|terminated)/);
    server.close();
  });
});

test("download aborts on socket destroy", { concurrency: false }, async () => {
  await inTempDir(async (dir) => {
    const { download } = loadModule();
    const { server, url } = await startServer((req, res) => {
      req.socket.destroy();
    });
    await assert.rejects(
      () => download(url, join(dir, "file.bin")),
      /(socket|fetch failed)/,
    );
    server.close();
  });
});


test('fetchAstronaut fails after retries', { concurrency: false }, async () => {
  await inTempDir(async () => {
    const { fetchAstronaut } = loadModule();
    const body = Buffer.from('astro');
    const { server, url } = await startServer((req, res) => {
      res.writeHead(200, { 'Content-Length': body.length });
      res.end(body.slice(0, body.length - 1));
    });
    process.env.ASTRONAUT_MODEL_URL = url;
    await assert.rejects(fetchAstronaut, /(incomplete response|terminated)/);

    server.close();
  });
});

test(
  "fetchBoombox rejects on truncated response",
  { concurrency: false },
  async () => {
    await inTempDir(async (dir) => {
      const { fetchBoombox } = loadModule();
      const body = Buffer.from("boom");
      const { server, url } = await startServer((req, res) => {
        res.writeHead(200, { "Content-Length": body.length });
        res.end(body.slice(0, body.length - 1));
      });
      process.env.BOOMBOX_MODEL_URL = url;
      await assert.rejects(fetchBoombox, /(incomplete|terminated)/);
      server.close();
    });
  },
);

test("fetchBoombox uses cached model", { concurrency: false }, async () => {
  await inTempDir(async (dir) => {
    const mod = loadModule();
    const body = Buffer.from("boom");
    let count = 0;
    const { server, url } = await startServer((req, res) => {
      count += 1;
      res.writeHead(200, { "Content-Length": body.length });
      res.end(body);
    });
    process.env.BOOMBOX_MODEL_URL = url;
    await mod.fetchBoombox();
    await mod.fetchBoombox();
    assert.equal(count, 1);
    const dest = join(dir, "frontend", "public", "models", "boombox.glb");
    const data = await fsp.readFile(dest);
    assert.deepEqual(data, body);
    server.close();
  });
});

test("fetchAstronaut rejects invalid URL", { concurrency: false }, async () => {
  await inTempDir(async () => {
    const { fetchAstronaut } = loadModule();
    process.env.ASTRONAUT_MODEL_URL = "::::";
    await assert.rejects(fetchAstronaut, TypeError);
  });
});

test("fetchAstronaut rejects on HTTP 404", { concurrency: false }, async () => {
  await inTempDir(async () => {
    const { fetchAstronaut } = loadModule();
    const { server, url } = await startServer((req, res) => {
      res.writeHead(404);
      res.end();
    });
    process.env.ASTRONAUT_MODEL_URL = url;
    await assert.rejects(fetchAstronaut, /HTTP 404/);
    server.close();
  });
});

test(
  "fetchAstronaut handles missing Content-Length",
  { concurrency: false },
  async () => {
    await inTempDir(async (dir) => {
      const { fetchAstronaut } = loadModule();
      const body = Buffer.from("astro");
      const { server, url } = await startServer((req, res) => {
        res.writeHead(200);
        res.end(body);
      });
      process.env.ASTRONAUT_MODEL_URL = url;
      const dest = await fetchAstronaut();
      const data = await fsp.readFile(dest);
      assert.deepEqual(data, body);
      server.close();
    });
  },
);

test(
  "fetchAstronaut retries after socket hangup and succeeds",
  { concurrency: false },
  async () => {
    await inTempDir(async (dir) => {
      const { fetchAstronaut } = loadModule();
      const body = Buffer.from("astro");
      let count = 0;
      const { server, url } = await startServer((req, res) => {
        count += 1;
        if (count === 1) {
          req.socket.destroy();
          return;
        }
        res.writeHead(200, { "Content-Length": body.length });
        res.end(body);
      });
      process.env.ASTRONAUT_MODEL_URL = url;
      const dest = await fetchAstronaut();
      const data = await fsp.readFile(dest);
      assert.deepEqual(data, body);
      assert.equal(count, 2);
      server.close();
    });
  },
);

test(
  "fetchAstronaut removes partial file on failure",
  { concurrency: false },
  async () => {
    await inTempDir(async (dir) => {
      const { fetchAstronaut } = loadModule();
      const body = Buffer.from("astro");
      const { server, url } = await startServer((req, res) => {
        res.writeHead(200, { "Content-Length": body.length });
        res.end(body.slice(0, body.length - 1));
      });
      process.env.ASTRONAUT_MODEL_URL = url;
      await assert.rejects(fetchAstronaut, /(incomplete response|terminated)/);
      const dest = join(dir, "frontend", "public", "models", "astronaut.glb");
      assert.equal(fs.existsSync(dest), false);
      server.close();
    });
  },
);

test(
  "fetchAstronaut redownloads when cached file is empty",
  { concurrency: false },
  async () => {
    await inTempDir(async (dir) => {
      const mod = loadModule();
      const body = Buffer.from("astro");
      let count = 0;
      const { server, url } = await startServer((req, res) => {
        count += 1;
        res.writeHead(200, { "Content-Length": body.length });
        res.end(body);
      });
      process.env.ASTRONAUT_MODEL_URL = url;
      const dest = await mod.fetchAstronaut();
      await fsp.truncate(dest, 0);
      const dest2 = await mod.fetchAstronaut();
      const data = await fsp.readFile(dest2);
      assert.deepEqual(data, body);
      assert.equal(count, 2);
      server.close();
    });
  },
);

test(
  "fetchAstronaut handles large multi-chunk download",
  { concurrency: false },
  async () => {
    await inTempDir(async (dir) => {
      const { fetchAstronaut } = loadModule();
      const size = 1.5 * 1024 * 1024;
      const body = Buffer.alloc(size, 0x61);
      const { server, url } = await startServer((req, res) => {
        res.writeHead(200, { "Content-Length": body.length });
        for (let i = 0; i < body.length; i += 64 * 1024) {
          res.write(body.slice(i, i + 64 * 1024));
        }
        res.end();
      });
      process.env.ASTRONAUT_MODEL_URL = url;
      const dest = await fetchAstronaut();
      const stats = await fsp.stat(dest);
      assert.equal(stats.size, body.length);
      server.close();
    });
  },
);
