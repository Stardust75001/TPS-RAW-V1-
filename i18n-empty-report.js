const fs=require('fs');const path=require('path');const JSON5=require('json5');
const LOCALES_DIR=path.resolve(process.cwd(),'locales');const OUT=path.resolve(process.cwd(),'i18n-empty-strings.csv');
const read=f=>JSON5.parse(fs.readFileSync(f,'utf8'));
function walk(o,p='',out=[]){for(const k of Object.keys(o)){const key=p?`${p}.${k}`:k;const v=o[k];
 if(v&&typeof v==='object'&&!Array.isArray(v)) walk(v,key,out); else if(v==='') out.push(key);} return out;}
(function(){
  const files=fs.readdirSync(LOCALES_DIR).filter(f=>f.endsWith('.json')&&!f.endsWith('.schema.json')&&f!=='untranslated_keys.csv');
  const rows=['locale,key'];
  for(const f of files){const j=read(path.join(LOCALES_DIR,f));for(const k of walk(j)) rows.push(`${f.replace('.json','')},"${k.replace(/"/g,'""')}"`);}
  fs.writeFileSync(OUT,rows.join('\n')+'\n','utf8');console.log(`Wrote ${OUT}`);} )();
