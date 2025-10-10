const fs=require('fs'),path=require('path'),JSON5=require('json5');
const EN=path.join(process.cwd(),'locales','en.default.json');
const read=f=>JSON5.parse(fs.readFileSync(f,'utf8')); const write=(f,o)=>fs.writeFileSync(f,JSON.stringify(o,null,2)+'\n');
let count=0;
function walk(o,p=''){for(const k of Object.keys(o)){const key=p?`${p}.${k}`:k;const v=o[k];
 if(v&&typeof v==='object'&&!Array.isArray(v)) walk(v,key);
 else if(typeof v==='string' && v.trim()===key){ const last=k.replace(/[_\.]/g,' '); o[k]=last.replace(/\b\w/g,m=>m.toUpperCase()); count++; }
}}
const en=read(EN); fs.copyFileSync(EN,EN+'.bak'); walk(en); write(EN,en); console.log('Replaced self-refs:',count);
