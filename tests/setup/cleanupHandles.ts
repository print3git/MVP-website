import { afterEach } from '@jest/globals';

function closeHandle(handle: any) {
  if (typeof handle?.close === 'function') {
    try {
      handle.close();
    } catch {}
  } else if (typeof handle?.destroy === 'function') {
    try {
      handle.destroy();
    } catch {}
  }
  if (typeof handle?.unref === 'function') {
    try {
      handle.unref();
    } catch {}
  }
}

afterEach(() => {
  jest.clearAllTimers();
  for (const handle of process._getActiveHandles()) {
    const name = handle.constructor?.name;
    if (name === 'TTYWrap' || name === 'ReadStream' || name === 'WriteStream') {
      continue;
    }
    closeHandle(handle);
  }
});
