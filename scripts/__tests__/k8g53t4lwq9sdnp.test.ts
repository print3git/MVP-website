const fs = require('fs');
const https = require('https');
const path = require('path');
const Ajv = require('ajv');

const logFile = process.env.SARIF_FILE ||
  path.join(__dirname, '..', '..', 'codeql-results.sarif');

const run = fs.existsSync(logFile) ? test : test.skip;

function fetchSchema() {
  return new Promise((resolve, reject) => {
    https.get('https://json.schemastore.org/sarif-2.1.0.json', res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function checkUris(obj) {
  if (Array.isArray(obj)) return obj.forEach(checkUris);
  if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      if (k.toLowerCase().includes('uri')) {
        if (!v) throw new Error(`Missing URI for ${k}`);
        try { new URL(v); } catch { throw new Error(`Invalid URI: ${v}`); }
      }
      if (v === null) {
        throw new Error(`Null value for ${k}`);
      }
      checkUris(v);
    }
  }
}

const recognized = ['CodeQL', 'ESLint', 'Bandit'];

run('valid SARIF structure', async () => {
  const schema = await fetchSchema();
  const ajv = new Ajv({ allErrors: true, strict: false });
  ajv.addFormat('uri', str => {
    try { new URL(str); return true; } catch { return false; }
  });

  const sarif = JSON.parse(fs.readFileSync(logFile, 'utf8'));
  const valid = ajv.validate(schema, sarif);
  if (!valid) {
    throw new Error('Schema validation failed:\n' + ajv.errorsText(ajv.errors, { separator: '\n' }));
  }

  checkUris(sarif);

  for (const run of sarif.runs || []) {
    const name = run.tool?.driver?.name;
    if (!recognized.includes(name)) {
      throw new Error(`Unrecognized tool name: ${name}`);
    }
  }
});
