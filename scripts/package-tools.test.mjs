import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {execFileSync,spawnSync} from 'node:child_process';
import {ROOT,privatePath,withoutFences,sha256} from './package-lib.mjs';

const write=(root,name,body)=>{const file=path.join(root,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,body);};
function fixture(){
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'latino-package-test-'));
 const source=path.join(temp,'source');fs.mkdirSync(source);
 const pkg={name:'source-app',version:'1.0.0',scripts:{},engines:{node:'>=22.13.0 <23'},packageManager:'pnpm@10.4.1'};
 const meta={name:pkg.name,version:pkg.version,scripts:{},release:{productionUrl:'https://source.example/',deploymentId:99},development:{languageEngine:'latin',serviceColors:{}},docs:{currentRelease:'README.md'},export:{cropBaselineDeploymentId:8731}};
 write(source,'package.json',JSON.stringify(pkg));write(source,'manifest.json',JSON.stringify(meta));
 write(source,'.gitignore','.env\n.env.*\n!.env.example\nnode_modules/\ndist/\n');
 write(source,'.env.example','EASY_PEASY_API_KEY=\n');
 write(source,'README.md','# SOURCE APP\n');write(source,'AGENTS.md','# Agent source\n');
 write(source,'client/index.html','<html lang="it"><head><title>SOURCE APP</title><meta name="description" content="source" /></head><body></body></html>');
 write(source,'client/src/pages/WelcomePage.tsx','export const title = <h1 className="title">SOURCE APP</h1>;\n');
 write(source,'render.yaml','services:\n  - type: web\n    name: source-app\n    runtime: node\n');
 const frame="<p>SOURCE APP</p><script>var APP_URL = 'https://source.example/';</script>";
 write(source,'cornice-dinamica/embed-latino-facile-dedicata.html',frame);
 write(source,'client/public/cornice-test/embed-latino-facile-dedicata.html',frame);
 for(const name of ['package-lib.mjs','clone-app.mjs'])write(source,'scripts/'+name,fs.readFileSync(path.join(ROOT,'scripts',name)));
 execFileSync('git',['init','--quiet',source]);
 execFileSync('git',['-C',source,'add','.']);
 commit(source,'fixture');
 // Solo file sintetici per provare l'esclusione, non segreti reali.
 write(source,'.env','SYNTHETIC_PRIVATE_VALUE=not-a-real-key\n');
 write(source,'node_modules/placeholder','fixture-dependency');write(source,'dist/placeholder','fixture-build');
 return {temp,source,dispose:()=>fs.rmSync(temp,{recursive:true,force:true})};
}
function commit(source,message){execFileSync('git',['-C',source,'-c','user.name=Package Test','-c','user.email=package-test@example.invalid','-c','commit.gpgsign=false','commit','--quiet','-m',message]);}
function run(f,args=[]){return spawnSync(process.execPath,[path.join(f.source,'scripts/clone-app.mjs'),'--target',path.join(f.temp,'new-app'),'--name','new-app','--title','NUOVA APP',...args],{encoding:'utf8'});}

test('esclude percorsi privati e runtime',()=>{
 for(const name of ['.env','.env.production','nested/.env.test','x/key.pem','x/secret.key','data.sqlite','a/node_modules/file','dist/index.js','old.zip'])assert.equal(privatePath(name),true,name);
});
test('consente file nascosti pubblici e patch',()=>{
 for(const name of ['.env.example','.github/workflows/ci.yml','.node-version','patches/wouter@3.7.1.patch','docs/data.json'])assert.equal(privatePath(name),false,name);
});
test('esclude dai link i blocchi codice di lunghezza diversa',()=>{
 const text='[valido](README.md)\n````md\n[esempio](non-esiste)\n```\n````\n[fine](AGENTS.md)';
 const clean=withoutFences(text);assert.ok(clean.includes('valido'));assert.ok(clean.includes('fine'));assert.ok(!clean.includes('non-esiste'));
});
test('hash è SHA-256 di bytes, non del nome',()=>{
 assert.equal(sha256(Buffer.from('abc')),'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});
test('clone isolato: niente segreti/storia/dipendenze, nuova identità e bozza',()=>{
 const f=fixture();try{
  const result=run(f);assert.equal(result.status,0,result.stderr);
  const dest=path.join(f.temp,'new-app');const meta=JSON.parse(fs.readFileSync(path.join(dest,'manifest.json')));
  assert.equal(meta.name,'new-app');assert.equal(meta.sourceApp.name,'source-app');assert.equal(meta.release.deploymentId,null);assert.equal(meta.development.languageEngine,'latin');
  for(const name of ['.git','.env','node_modules','dist'])assert.ok(!fs.existsSync(path.join(dest,name)),name);
  assert.ok(fs.existsSync(path.join(dest,'.env.example')));assert.ok(fs.existsSync(path.join(dest,'VARIANTE-DA-ADATTARE.md')));
  const frame=fs.readFileSync(path.join(dest,'cornice-dinamica/embed-latino-facile-dedicata.html'),'utf8');
  assert.ok(frame.includes('https://da-configurare.invalid/'));assert.ok(!frame.includes('https://source.example/'));
  assert.equal(frame,fs.readFileSync(path.join(dest,'client/public/cornice-test/embed-latino-facile-dedicata.html'),'utf8'));
 }finally{f.dispose();}
});
test('rifiuta overwrite senza modificare la destinazione',()=>{
 const f=fixture();try{
  write(f.temp,'new-app/protected.txt','keep');const result=run(f);assert.notEqual(result.status,0);assert.match(result.stderr,/esistente/);assert.equal(fs.readFileSync(path.join(f.temp,'new-app/protected.txt'),'utf8'),'keep');
 }finally{f.dispose();}
});
test('rifiuta sorgente sporca senza creare il clone',()=>{
 const f=fixture();try{
  fs.appendFileSync(path.join(f.source,'README.md'),'changed');const result=run(f);assert.notEqual(result.status,0);assert.match(result.stderr,/non pulita/);assert.ok(!fs.existsSync(path.join(f.temp,'new-app')));
 }finally{f.dispose();}
});
test('rifiuta credenziali in URL e destinazioni interne',()=>{
 const f=fixture();try{
  const invalid=run(f,['--url','https://user:secret@example.invalid/']);assert.notEqual(invalid.status,0);assert.ok(!fs.existsSync(path.join(f.temp,'new-app')));
  const inside=spawnSync(process.execPath,[path.join(f.source,'scripts/clone-app.mjs'),'--target',path.join(f.source,'nested'),'--name','new-app','--title','NEW'],{encoding:'utf8'});
  assert.notEqual(inside.status,0);assert.ok(!fs.existsSync(path.join(f.source,'nested')));
 }finally{f.dispose();}
});
test('titolo contiene dollari/graffe senza espansioni di replacement o JSX',()=>{
 const f=fixture();try{
  const title='APP $1 {prova} & "nome"';
  const result=spawnSync(process.execPath,[path.join(f.source,'scripts/clone-app.mjs'),'--target',path.join(f.temp,'new-app'),'--name','new-app','--title',title],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  const welcome=fs.readFileSync(path.join(f.temp,'new-app/client/src/pages/WelcomePage.tsx'),'utf8');
  assert.ok(welcome.includes('$1'));assert.ok(welcome.includes('&#123;prova&#125;'));assert.ok(welcome.includes('&amp;'));assert.ok(welcome.includes('&quot;nome&quot;'));
 }finally{f.dispose();}
});
