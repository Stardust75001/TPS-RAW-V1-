/* Autofill missing Shopify locale keys from en.default.json
 * Usage: node autofill-i18n.js
 * Makes .bak backups and writes i18n-missing-export.csv
 */
const fs = require('fs');
const path = require('path');
const JSON5 = require('json5');

const LOCALES_DIR = path.resolve(process.cwd(), 'locales');
const SRC = 'en.default.json';
const EXPORT_CSV = path.resolve(process.cwd(), 'i18n-missing-export.csv');

const readJSON = (f) => JSON5.parse(fs.readFileSync(f, 'utf8')); // tolerant read (comments, trailing commas)
const writeJSON = (f, obj) => fs.writeFileSync(f, JSON.stringify(obj, null, 2) + '\n', 'utf8'); // strict JSON out
const isPlain = (v) => v && typeof v === 'object' && !Array.isArray(v);

function deepFill(target, source, missingRows, prefix = '') {
  let added = 0;
  for (const k of Object.keys(source)) {
    const keyPath = prefix ? `${prefix}.${k}` : k;
    if (!(k in target)) {
      target[k] = isPlain(source[k]) ? {} : source[k];
      if (!isPlain(source[k])) missingRows.push([keyPath, String(source[k]), '']);
      added++;
    }
    if (isPlain(source[k])) {
      if (!isPlain(target[k])) target[k] = {};
      added += deepFill(target[k], source[k], missingRows, keyPath);
    }
  }
  return added;
}

(function main() {
  if (!fs.existsSync(LOCALES_DIR)) {
    console.error('No /locales directory found. Run this at your theme root.');
    process.exit(1);
  }
  const srcPath = path.join(LOCALES_DIR, SRC);
  if (!fs.existsSync(srcPath)) {
    console.error(`Missing ${SRC} in /locales. Make sure English is your source.`);
    process.exit(1);
  }
  const source = readJSON(srcPath);
  const files = fs.readdirSync(LOCALES_DIR).filter(f => f.endsWith('.default.json') && f !== SRC);

  if (files.length === 0) {
    console.log('No other locale files to fill. Nothing to do.');
    return;
  }

  const csvRows = [];
  for (const file of files) {
    const lang = file.replace('.default.json', '');
    const p = path.join(LOCALES_DIR, file);
    const target = readJSON(p);

    const missingRows = [];
    const added = deepFill(target, source, missingRows);

    if (added > 0) {
      fs.copyFileSync(p, `${p}.bak`);
      writeJSON(p, target);
      for (const row of missingRows) csvRows.push([row[0], row[1], lang, '']);
      console.log(`✅ ${file}: added ${added} missing keys`);
    } else {
      console.log(`✔︎ ${file}: up to date (no keys added)`);
    }
  }

  if (csvRows.length) {
    const header = 'key,en,locale,translation';
    const body = csvRows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    fs.writeFileSync(EXPORT_CSV, header + '\n' + body + '\n', 'utf8');
    console.log(`🗂  CSV for translators written to: ${EXPORT_CSV}`);
  } else {
    console.log('No missing keys were found; CSV not created.');
  }
})();
