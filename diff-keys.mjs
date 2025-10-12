import { readFileSync, readdirSync, statSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';

const OFFICIAL = new Set([
  'en.default.json','fr.json','es.json','de.json','da.json',
  'it.json','nl.json','pl.json','pt.json','sv.json'
]);

function shouldIgnore(p) {
  const b = basename(p);
  if (!b.endsWith('.json')) return true;
  if (b.endsWith('.synced.json')) return true;
  if (b.endsWith('.sorted.json')) return true;
  if (b.endsWith('.bak.json')) return true;
  return false;
}

function walkFiles(inputs) {
  const files = [];
  for (const p of inputs) {
    let st;
    try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) {
      for (const e of readdirSync(p)) {
        const full = join(p, e);
        let st2; try { st2 = statSync(full); } catch { continue; }
        if (st2.isDirectory()) continue;
        if (extname(full) === '.json' && !shouldIgnore(full) && OFFICIAL.has(basename(full))) {
          files.push(full);
        }
      }
    } else if (extname(p) === '.json' && !shouldIgnore(p) && OFFICIAL.has(basename(p))) {
      files.push(p);
    }
  }
  return files;
}

function loadJSON(path) {
  const raw = readFileSync(path, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (e) {
    throw new Error(`Invalid JSON: ${path} -> ${e.message}`);
  }
}

function flatten(obj, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(obj || {})) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out);
    else out[key] = v;
  }
  return out;
}

function compareKeys(refObj, otherObj) {
  const ref = new Set(Object.keys(flatten(refObj)));
  const o   = new Set(Object.keys(flatten(otherObj)));
  const missing = [...ref].filter(k => !o.has(k)).sort();
  const extra   = [...o].filter(k => !ref.has(k)).sort();
  return { missing, extra };
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0) {
    console.error('Usage: node diff-keys.mjs <locales/ or files...>');
    process.exit(1);
  }

  // ref = en.default.json (à partir du 1er chemin contenant ce fichier)
  let refPath = null;
  const candidates = walkFiles(argv);
  for (const f of candidates) {
    if (basename(f) === 'en.default.json') { refPath = f; break; }
  }
  if (!refPath) {
    // fallback: si dossier donné, essaie locales/en.default.json
    const first = argv[0];
    refPath = join(first, 'en.default.json');
  }

  const files = walkFiles(argv).filter(f => basename(f) !== 'en.default.json');
  const report = [];
  let hasDiff = false;
  let refObj;

  try {
    refObj = loadJSON(refPath);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }

  for (const f of files) {
    try {
      const data = loadJSON(f);
      const { missing, extra } = compareKeys(refObj, data);
      if (missing.length || extra.length) hasDiff = true;
      report.push({
        file: f,
        missing_count: missing.length,
        extra_count: extra.length,
        missing_keys: missing,
        extra_keys: extra
      });
    } catch (e) {
      hasDiff = true;
      report.push({
        file: f,
        error: e.message
      });
    }
  }

  const out = JSON.stringify(report, null, 2);
  console.log(out);
  await writeFile('locale_key_report.json', out, 'utf8');
  process.exit(hasDiff ? 2 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
