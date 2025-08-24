import fs from 'node:fs';

describe('gitattributes LFS guard', () => {
  test('excludes test snapshots from LFS', () => {
    const attrs = fs.readFileSync('.gitattributes', 'utf8');
    expect(attrs).toMatch(/tests\/\*\*\/__image_snapshots__\/\* -filter -merge text diff/);
    expect(attrs).toMatch(/tests\/\*\*\/__screenshots__\/\* -filter -merge text diff/);
    expect(attrs).toMatch(/tests\/lfs_guard\/\*\* -filter -merge text diff/);
  });
});
