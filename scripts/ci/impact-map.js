const fs = require('fs');
const { spawnSync } = require('child_process');
const path = require('path');

function parseMap(file) {
  const text = fs.readFileSync(file, 'utf8');
  const map = {};
  let current;
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (!line.startsWith(' ')) {
      current = line.replace(':', '').trim();
      map[current] = [];
    } else if (line.trim().startsWith('-')) {
      map[current].push(line.trim().slice(1).trim());
    }
  }
  return map;
}

function getChanged(base, head) {
  const res = spawnSync('git', ['diff', '--name-only', base, head], { encoding: 'utf8' });
  if (res.status !== 0) throw new Error(res.stderr);
  return res.stdout.split('\n').filter(Boolean);
}

const base = process.env.BASE_SHA || 'origin/main';
const head = process.env.HEAD_SHA || 'HEAD';
const files = getChanged(base, head);
const impact = parseMap(path.join('ci', 'impact-map.yml'));
const suites = { backend: false, frontend: false, e2e: false, docs: false, infra: false };

for (const file of files) {
  for (const [suite, patterns] of Object.entries(impact)) {
    if (patterns.some(p => new RegExp('^' + p.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*')).test(file))) {
      suites[suite] = true;
    }
  }
}

for (const [k, v] of Object.entries(suites)) {
  console.log(`${k}=${v}`);
}
