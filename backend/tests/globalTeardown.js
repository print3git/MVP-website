const nock = require("nock");

module.exports = async () => {
  nock.enableNetConnect();
  const leaks = global.__LEAKS__ || [];
  for (const leak of leaks) {
    if (typeof leak.close === "function") {
      await new Promise((r) => leak.close(r));
    }
    if (typeof leak.clear === "function") {
      leak.clear();
    }
  }

  const ignored = [process.stdout, process.stderr, process.stdin];
  for (let i = 0; i < 5; i++) {
    const handles = process
      ._getActiveHandles()
      .filter((h) => !ignored.includes(h));
    if (handles.length === 0) return;
    await new Promise((r) => setTimeout(r, 50));
  }

  const remaining = process
    ._getActiveHandles()
    .filter((h) => !ignored.includes(h));
  if (!process.env.SKIP_HANDLE_CHECK && remaining.length) {
    console.error("\u274c Teardown detected lingering handles:", remaining);
    process.exit(1);
  }
};
