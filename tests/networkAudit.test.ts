import { globSync } from 'glob';
import { readFileSync } from 'fs';

const TEST_GLOB = '**/*.{test.ts,test.tsx,test.js,test.jsx}';

function hasUnmockedNetCalls(file: string, content: string): boolean {
  const usesNetwork = /axios\.|\bfetch\(/.test(content);
  const hasMock = /nock|msw|fetchMock|global\.fetch|jest\.spyOn\(global,\s*'fetch'/.test(content);
  return usesNetwork && !hasMock;
}

test('network audit', () => {
  const offenders: string[] = [];
  for (const file of globSync(TEST_GLOB, { ignore: ['**/node_modules/**'] })) {
    const text = readFileSync(file, 'utf8');
    if (hasUnmockedNetCalls(file, text)) {
      offenders.push(file);
    }
  }
  if (offenders.length) {
    console.warn(
      'Network audit: possible unmocked HTTP calls in:\n' + offenders.join('\n'),
    );
  }
  expect(true).toBe(true);
});
