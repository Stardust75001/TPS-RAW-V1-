const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const JSON5 = require('json5');

const LOCALES_DIR = path.resolve(process.cwd(), 'locales');
const SRC_FILE = path.join(LOCALES_DIR, 'en.default.json');
const EXPORT_CSV = path.resolve(process.cwd(), 'i18n-missing-export.csv');

const readJSON5 = f => JSON5.parse(fs.readFileSync(f, 'utf8'));
const writeJSON = (f, o) => fs.writeFileSync(f, JSON.stringify(o, null, 2) + '\n');
function safeRead(file) {
  try { return readJSON5(file); }
  catch (_) {
    const fixed = execSync(`npx -y jsonrepair "${file}"`, { stdio: ['ignore','pipe','inherit'] }).toString();
    fs.copyFileSync(file, file + '.bak');
    fs.writeFileSync(file, fixed, 'utf8');
    return readJSON5(file);
  }
}
const isPlain = o => o && typeof o === 'object' && !Array.isArray(o);

function deepFill(target, source, missingRows, prefix='') {
  let added = 0;
  for (const k of Object.keys(source)) {
    const keyPath = prefix ? `${prefix}.${k}` : k;
    if (!(k in target)) {
      target[k] = isPlain(source[k]) ? {} : source[k];
      if (!isPlain(source[k])) missingRows.push([keyPath, String(source[k])]);
      added++;
    }
    if (isPlain(source[k])) {
      if (!isPlain(target[k])) target[k] = {};
      added += deepFill(target[k], source[k], missingRows, keyPath);
    }
  }
  return added;
}

(function main(){
  if (!fs.existsSync(LOCALES_DIR)) { console.error('No /locales dir'); process.exit(1); }
  if (!fs.existsSync(SRC_FILE)) { console.error('Missing en.default.json'); process.exit(1); }

  const source = safeRead(SRC_FILE);
  const files = fs.readdirSync(LOCALES_DIR).filter(f =>
    f.endsWith('.json') &&
    f !== 'en.default.json' &&
    !f.endsWith('.schema.json') &&
    f !== 'untranslated_keys.csv'
  );

  let csvRows = [];
  for (const f of files) {
    const p = path.join(LOCALES_DIR, f);
    const target = safeRead(p);
    const missingRows = [];
    const added = deepFill(target, source, missingRows);
    if (added > 0) {
      fs.copyFileSync(p, p + '.bak');
      writeJSON(p, target);
      const locale = f.replace(/\.json$/,'');
      for (const row of missingRows) csvRows.push([row[0], row[1], locale, '']);
      console.log(`✅ ${f}: added ${added} missing keys`);
    } else {
      console.log(`✔︎ ${f}: up to date (no keys added)`);
    }
  }

  if (csvRows.length) {
    const header = 'key,en,locale,translation';
    const body = csvRows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    fs.writeFileSync(EXPORT_CSV, header + '\n' + body + '\n', 'utf8');
    console.log(`🗂  CSV written: ${EXPORT_CSV}`);
  } else {
    console.log('No missing keys were found; CSV not created.');
  }
})();
