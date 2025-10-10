const fs=require('fs'),path=require('path'),JSON5=require('json5');
const dir=path.join(process.cwd(),'locales');
const en=JSON5.parse(fs.readFileSync(path.join(dir,'en.default.json'),'utf8'));
function countKeys(o){let c=0;for(const k in o){c+= (o[k]&&typeof o[k]==='object'&&!Array.isArray(o[k]))?countKeys(o[k]):1;}return c;}
const total=countKeys(en);
for(const f of fs.readdirSync(dir).filter(x=>x.endsWith('.json')&&!x.endsWith('.schema.json')&&x!=='untranslated_keys.csv')){
  const j=JSON5.parse(fs.readFileSync(path.join(dir,f),'utf8'));
  let present=0, empty=0;
  (function walk(a,b){for(const k in a){if(a[k]&&typeof a[k]==='object'&&!Array.isArray(a[k])) walk(a[k],b[k]||{});
    else{ if(b&&k in b){present++; if(b[k]==='') empty++;}}}})(en,j);
  console.log(`${f}: keys=${total}, present=${present}, empty=${empty}`);
}
