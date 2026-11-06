import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const version=process.argv[2]||'2.8.116';
if(!/^2\.8\.\d+$/.test(version))throw new Error('Invalid reference version');
const reference=path.join(root,`reference/original-${version}`);
const assets=path.join(reference,'apk-extracted/assets');
const output=path.join(reference,'patched');
fs.mkdirSync(output,{recursive:true});
const manifest=JSON.parse(fs.readFileSync(path.join(assets,'patch-manifest.json'),'utf8'));
const reports=[];
for(const file of fs.readdirSync(path.join(assets,'patch-seed'))){
  const built=path.join(assets,'patch-built',file);
  let source=fs.readFileSync(fs.existsSync(built)?built:path.join(assets,'patch-seed',file),'utf8').replace(/\r\n/g,'\n');
  const missing=[];
  if(!fs.existsSync(built))for(const [index,rule] of (manifest[file]||[]).entries()){
    const at=source.indexOf(rule.find);
    if(at>=0)source=source.slice(0,at)+rule.replace+source.slice(at+rule.find.length);
    else if(!source.includes(rule.replace))missing.push(index+1);
  }
  if(file.endsWith('.js'))new vm.Script(source,{filename:file});
  fs.writeFileSync(path.join(output,file),source);
  reports.push({file,prebuilt:fs.existsSync(built),missing});
}
fs.writeFileSync(path.join(root,`verification/reference-${version.split('.').at(-1)}.json`),JSON.stringify(reports,null,2));
console.log(JSON.stringify(reports.filter(item=>item.prebuilt||item.missing.length),null,2));
