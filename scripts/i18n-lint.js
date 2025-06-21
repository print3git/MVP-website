const fs = require('fs');
const path = require('path');

const translationsPath = path.join(__dirname, '..', 'backend', 'translations.json');
const templatesDir = path.join(__dirname, '..', 'backend', 'email_templates');

const translations = JSON.parse(fs.readFileSync(translationsPath, 'utf8'));
const templates = fs.readdirSync(templatesDir).filter(f => f.endsWith('.txt'));

const missing = [];
const unused = new Set(Object.keys(translations));

for (const file of templates) {
  const base = path.basename(file, '.txt');
  const subjectKey = `${base}.subject`;
  const bodyKey = `${base}.body`;
  if (translations[subjectKey] == null || translations[subjectKey] === '') missing.push(subjectKey); else unused.delete(subjectKey);
  if (translations[bodyKey] == null || translations[bodyKey] === '') missing.push(bodyKey); else unused.delete(bodyKey);
}

if (missing.length || unused.size) {
  console.error('i18n lint failed.');
  if (missing.length) console.error('Missing keys:', missing.join(', '));
  if (unused.size) console.error('Unused keys:', Array.from(unused).join(', '));
  process.exit(1);
}
console.log('i18n lint passed.');

