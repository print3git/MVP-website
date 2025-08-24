#!/usr/bin/env node

console.log(
  `CI plumbing verification suite\n\nChecks for:\n- pnpm availability\n- frontend prerequisites (vite)\n- wrangler.toml Pages config\n- Git LFS pointer integrity\n- pnpm lockfile parity\n- composite action shell fields\n- CodeQL tools config\n- artifact producer/consumer contracts\n- dist output paths\n- ESLint config sanity\n- browser global usage in SSR contexts\n\nRun locally with:\n  node --test tests/ci/**/*.test.js\n`,
);
