const fs = require('fs');
const path = require('path');
const JSON5 = require('json5');

const LOCALES_DIR = path.resolve(process.cwd(), 'locales');
const EN = path.join(LOCALES_DIR, 'en.default.json');
const DONOR = path.join(LOCALES_DIR, 'da.json'); // donor = most complete

const read = f => JSON5.parse(fs.readFileSync(f, 'utf8'));
const write = (f, o) => fs.writeFileSync(f, JSON.stringify(o, null, 2) + '\n');

function mergeIfEmpty(enObj, donorObj) {
  let filled = 0;
  for (const k of Object.keys(donorObj)) {
    const dv = donorObj[k];
    const ev = enObj[k];
    if (dv && typeof dv === 'object' && !Array.isArray(dv)) {
      if (!enObj[k] || typeof ev !== 'object' || Array.isArray(ev)) enObj[k] = {};
      filled += mergeIfEmpty(enObj[k], dv);
    } else {
      const isEmpty = ev === '' || ev === undefined || ev === null;
      if (isEmpty && dv !== '') { enObj[k] = dv; filled++; }
    }
  }
  return filled;
}

(function main(){
  const en = read(EN);
  const donor = read(DONOR);
  const count = mergeIfEmpty(en, donor);
  fs.copyFileSync(EN, EN + '.bak');
  write(EN, en);
  console.log(`Promoted ${count} empty EN keys from ${path.basename(DONOR)}.`);
})();
