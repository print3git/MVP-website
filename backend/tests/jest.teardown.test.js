afterAll(() => {
  const handles = process
    ._getActiveHandles()
    .filter((h) => ![process.stdin, process.stdout, process.stderr].includes(h));
  if (handles.length) {
    // eslint-disable-next-line no-console
    console.log('Open handles detected:', handles);
    fail(`Open handles detected: ${handles.length}`);
  }
  expect.hasAssertions();
});

test('jest teardown guard', () => {
  expect(true).toBe(true);
});
