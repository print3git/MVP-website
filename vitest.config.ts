import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/lfs-audit.test.ts', '**/*test-inventory*.{js,ts}'],
  },
});
