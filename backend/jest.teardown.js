module.exports = async () => {
  // Wait a tick for outstanding timers to settle
  await new Promise((r) => setTimeout(r, 10));
  const handles = process
    ._getActiveHandles()
    .filter((h) => ![process.stdin, process.stdout, process.stderr].includes(h));
  if (handles.length > 0) {
    console.error('Lingering async handles detected:');
    handles.forEach((h) => console.error(h));
    process.exit(1);
  }
};
