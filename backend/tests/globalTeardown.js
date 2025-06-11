module.exports = async () => {
  const leaks = global.__LEAKS__ || [];
  for (const leak of leaks) {
    try {
      if (typeof leak.close === 'function') {
        await new Promise((res) => leak.close(res));
      } else if (typeof leak.clear === 'function') {
        leak.clear();
      } else if (typeof leak === 'function') {
        leak();
      }
    } catch (err) {
      console.error('Error closing leak', err);
    }
  }
  const ignored = [process.stdout, process.stderr];
  const open = process._getActiveHandles().filter((h) => !ignored.includes(h));
  if (open.length) {
    console.error('\u274c Teardown detected lingering handles:', open);
    process.exit(1);
  }
};
