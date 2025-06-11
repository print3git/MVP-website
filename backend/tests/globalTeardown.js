module.exports = async () => {
  const leaks = global.__LEAKS__ || [];
  for (const leak of leaks) {
    if (typeof leak.close === 'function') {
      await new Promise((r) => leak.close(r));
    }
    if (typeof leak.clear === 'function') {
      leak.clear();
    }
  }
  const ignored = [process.stdout, process.stderr];
  const open = process._getActiveHandles().filter((h) => !ignored.includes(h));
  if (open.length) {
    console.error('\u274c Teardown detected lingering handles:', open);
    process.exit(1);
  }
};
