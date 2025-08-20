import http from "http";

// Simple resource reaper that tracks cleanup callbacks.
const cleanup: Array<() => void> = [];

function registerServer(server: http.Server) {
  cleanup.push(() => new Promise((resolve) => server.close(resolve)) as any);
}

function registerTimer(timer: NodeJS.Timeout) {
  cleanup.push(() => clearInterval(timer));
}

async function reap() {
  for (const fn of cleanup.splice(0)) {
    await fn();
  }
}

test("reaper handles server and timer", (done) => {
  const server = http.createServer((_req, res) => res.end("ok"));
  server.listen(0, () => {
    const timer = setInterval(() => {}, 50);
    registerServer(server);
    registerTimer(timer);
    done();
  });
});

afterAll(async () => {
  await reap();
});
