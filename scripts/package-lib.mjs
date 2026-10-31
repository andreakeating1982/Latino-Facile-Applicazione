import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
export const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
export const slash = value => value.split(path.sep).join('/');
export const ignoredDirs = new Set(['.git','node_modules','dist','build','.cache','.pnpm-store','coverage','reports','__pycache__','.vscode','.idea']);
export function privatePath(relative) {
  const parts = relative.replaceAll('\\','/').split('/');
  const name = parts.at(-1);
  return parts.some(p => ignoredDirs.has(p)) ||
    (name.startsWith('.env') && name !== '.env.example') ||
    /\.(?:log|db|sqlite3?|pem|key|zip|pyc)$/i.test(name) ||
    name === '.DS_Store';
}
export function gitRoot(root=ROOT) {
  try {
    const top=execFileSync('git',['-C',root,'rev-parse','--show-toplevel'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();
    return fs.realpathSync(top) === fs.realpathSync(root);
  } catch { return false; }
}
export function git(root,...args) {
  return execFileSync('git',['-C',root,...args],{maxBuffer:128*1024*1024});
}
export function portableFiles(root=ROOT,{committedOnly=false}={}) {
  if(gitRoot(root)) {
    const args=committedOnly?['ls-tree','-r','-z','--name-only','HEAD']:['ls-files','-z','--cached','--others','--exclude-standard'];
    return [...new Set(git(root,...args).toString().split('\0').filter(Boolean))].sort();
  }
  if(committedOnly)throw new Error('Serve una repository Git locale, con commit, nella cartella sorgente.');
  const files=[];
  const visit=dir=>{
    for(const entry of fs.readdirSync(dir,{withFileTypes:true})) {
      const full=path.join(dir,entry.name),rel=slash(path.relative(root,full));
      if(entry.isDirectory()) {if(!ignoredDirs.has(entry.name))visit(full);}
      else if(!privatePath(rel))files.push(rel);
    }
  };
  visit(root);return files.sort();
}
export function ensureInside(root,relative) {
  const full=path.resolve(root,relative);
  if(full!==root&&!full.startsWith(root+path.sep))throw new Error('Percorso fuori progetto: '+relative);
  return full;
}
export function withoutFences(text) {
  let fence=null;const output=[];
  for(const line of text.split('\n')) {
    const match=line.match(/^\s{0,3}(`{3,}|~{3,})/);
    if(match) {
      if(!fence)fence=match[1];
      else if(match[1][0]===fence[0]&&match[1].length>=fence.length)fence=null;
      continue;
    }
    if(!fence)output.push(line);
  }
  return output.join('\n');
}
export function cropGuideCheck(root=ROOT) {
  const file=path.join(root,'PHOTO-CROP-CLONABILE.md');
  if(!fs.existsSync(file))throw new Error('Manca il foglio autonomo del cropper.');
  const guide=fs.readFileSync(file,'utf8');
  const embedded=new Map([...guide.matchAll(/^### FILE: ([^\n]+)\n\n````[^\n]*\n(.*?)^````\n/gms)].map(m=>[m[1],m[2]]));
  const block=guide.split('## HASH SHA-256 DEI FILE TESTUALI')[1];
  if(!block)throw new Error('Manca il manifest hash nel foglio cropper.');
  const json=block.match(/```json\n(.*?)\n```/s);
  if(!json)throw new Error('Manifest cropper non valido.');
  const manifest=JSON.parse(json[1]),expected=manifest.file_sha256;
  if(embedded.size!==Object.keys(expected).length||embedded.size!==18)throw new Error('Il foglio cropper deve contenere i 18 sorgenti della baseline.');
  let matches=0;
  for(const [relative,body]of embedded) {
    if(sha256(body)!==expected[relative])throw new Error('Hash incorporato cropper errato: '+relative);
    const existing=ensureInside(root,relative);
    if(fs.existsSync(existing)) {
      if(sha256(fs.readFileSync(existing))!==expected[relative])throw new Error('Sorgente cropper diverso dal foglio: '+relative);
      matches++;
    }
  }
  return {embeddedSources:embedded.size,repositorySourcesMatched:matches,baselineDeployment:manifest.production_baseline_deployment,allHashesValid:true};
}
export function writeReport(file,data) {
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n');
}
