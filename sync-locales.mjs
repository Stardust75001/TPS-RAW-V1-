import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
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
  return JSON.parse(raw); // laisse throw: on veut savoir quel fichier est invalide
}

// Recrée un objet avec la structure exacte du template.
// - Si la clé existe dans data → garde la valeur (même chaîne vide)
// - Sinon → met la valeur du template (souvent anglais)
function rebuildFromTemplate(template, data) {
  if (template && typeof template === 'object' && !Array.isArray(template)) {
    const out = Array.isArray(template) ? [] : {};
    for (const [k, v] of Object.entries(template)) {
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        out[k] = rebuildFromTemplate(v, (data || {})[k]);
      } else {
        out[k] = (data && Object.prototype.hasOwnProperty.call(data, k)) ? data[k] : v;
      }
    }
    return out;
  }
  return (data === undefined) ? template : data;
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0) {
    console.error('Usage: node sync-locales.mjs <locales/ or files...>');
    process.exit(1);
  }

  const inputs = walkFiles(argv);
  const refPath = inputs.find(f => basename(f) === 'en.default.json')
               || join(argv[0], 'en.default.json');

  let ref;
  try { ref = loadJSON(refPath); }
  catch (e) { console.error(`Ref error: ${e.message}`); process.exit(1); }

  const produced = [];
  const invalid = [];

  for (const f of inputs) {
    const base = basename(f);
    if (base === 'en.default.json') continue;
    try {
      const data = loadJSON(f);
      const synced = rebuildFromTemplate(ref, data);
      const outPath = f.replace(/\.json$/i, '.synced.json');
      writeFileSync(outPath, JSON.stringify(synced, null, 2), 'utf8');
      produced.push(outPath);
    } catch (e) {
      invalid.push({ file: f, error: e.message });
    }
  }

  const summary = { produced, invalid };
  console.log(JSON.stringify(summary, null, 2));
  await writeFile('sync_summary.json', JSON.stringify(summary, null, 2), 'utf8');

  // code de sortie 2 si fichiers invalides
  process.exit(invalid.length ? 2 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
