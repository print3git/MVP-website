const fs = require('fs');
const os = require('os');
const path = require('path');
const { validate } = require('../../../scripts/ci-guard/required-workflows/validate');

test('reports missing files', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rw-'));
  const cfg = { mode: 'warn', paths: ['a.yml', 'b.yml'] };
  fs.writeFileSync(path.join(tmp, 'list.json'), JSON.stringify(cfg));
  const res = validate(path.join(tmp, 'list.json'), tmp);
  expect(res.missing).toEqual(['a.yml', 'b.yml']);
});

test('no missing files', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rw-'));
  fs.writeFileSync(path.join(tmp, 'a.yml'), '');
  const cfg = { mode: 'fail', paths: ['a.yml'] };
  fs.writeFileSync(path.join(tmp, 'list.json'), JSON.stringify(cfg));
  const res = validate(path.join(tmp, 'list.json'), tmp);
  expect(res.missing).toEqual([]);
});
