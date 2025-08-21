// eslint-disable-next-line @typescript-eslint/no-var-requires
const reaper = require('./reaper');

const STALL_MS = 10_000;
let stallTimer: NodeJS.Timeout | null = null;

beforeEach(() => {
  const name = expect.getState().currentTestName;
  stallTimer = setTimeout(() => {
    const handles = (process as any)._getActiveHandles?.() || [];
    console.error(
      `Test "${name}" has not finished after ${STALL_MS}ms; open handles: ${handles.length}`,
    );
  }, STALL_MS);
});

afterEach(() => {
  if (stallTimer) {
    clearTimeout(stallTimer);
    stallTimer = null;
  }
});

module.exports = reaper;
