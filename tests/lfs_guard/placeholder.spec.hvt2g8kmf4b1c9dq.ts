import fs from 'node:fs';

test('placeholder snapshot exists and is not an LFS pointer', () => {
  const buf = fs.readFileSync('tests/lfs_guard/__image_snapshots__/placeholder.png');
  const head = buf.subarray(0, 8).toString('hex');
  // PNG magic number
  expect(head).toBe('89504e470d0a1a0a');
});
