#!/usr/bin/env node
/** Controlli offline, senza dipendenze npm, chiavi o database. */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {ROOT,readJson,portableFiles,privatePath,ensureInside,withoutFences,cropGuideCheck,sha256,writeReport} from './package-lib.mjs';

const report={ok:false,checks:[],warnings:[],networkCalls:false};
const check=(name,condition)=>{if(!condition)throw new Error(name);report.checks.push(name);};
try {
  const pkg=readJson(path.join(ROOT,'package.json'));
  const meta=readJson(path.join(ROOT,'manifest.json'));
  check('Nome pacchetto sicuro e allineato al manifest',/^[a-z0-9][a-z0-9-]*$/.test(pkg.name)&&pkg.name===meta.name);
  check('Script manifest allineati a package.json',JSON.stringify(meta.scripts)===JSON.stringify(pkg.scripts));
  check('Versioni ambiente allineate',pkg.engines.node===meta.node&&pkg.packageManager===meta.packageManager);
  const node=fs.readFileSync(path.join(ROOT,'.node-version'),'utf8').trim();
  check('Node 22 pin completo',/^22\.\d+\.\d+$/.test(node));
  check('pnpm con versione e hash',/^pnpm@10\.4\.1\+sha512\./.test(pkg.packageManager));
  const files=portableFiles(ROOT);const set=new Set(files);
  check('File indispensabili presenti',meta.portablePackage.requiredFiles.every(f=>set.has(f)&&fs.existsSync(ensureInside(ROOT,f))));
  for(const relative of files) {
    check('Percorso esportabile: '+relative,!privatePath(relative));
    const full=ensureInside(ROOT,relative),stat=fs.lstatSync(full);
    check('File regolare: '+relative,stat.isFile()&&!stat.isSymbolicLink());
    const content=fs.readFileSync(full);
    const secrets=/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bsk-[A-Za-z0-9]{32,}\b|\bAIza[A-Za-z0-9_-]{35}\b/;
    check('Nessuna firma di segreto nota: '+relative,!secrets.test(content.toString('latin1')));
  }
  report.filesChecked=files.length;
  // Rimuovere i blocchi codice: i sorgenti incorporati e gli esempi non sono link operativi.
  let links=0;
  for(const relative of files.filter(f=>f.endsWith('.md')&&!f.startsWith('docs/storico/'))) {
    const text=withoutFences(fs.readFileSync(path.join(ROOT,relative),'utf8'));
    for(const match of text.matchAll(/\[[^\]\n]*\]\(([^)\n]+)\)/g)) {
      let target=match[1].trim().split(/\s+["']/)[0];
      if(/^(?:https?:|mailto:|data:|#)/i.test(target)||/[<>]/.test(target))continue;
      target=decodeURIComponent(target.split('#')[0]);if(!target)continue;
      const resolved=path.resolve(ROOT,path.dirname(relative),target);
      check('Collegamento interno: '+relative+' → '+target,resolved.startsWith(ROOT+path.sep)&&fs.existsSync(resolved));links++;
    }
  }
  report.localLinksChecked=links;
  const example=fs.readFileSync(path.join(ROOT,'.env.example'),'utf8');
  for(const line of example.split('\n')) {
    if(!line.trim()||line.trim().startsWith('#'))continue;
    const match=line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
    check('.env.example contiene solo valori vuoti',!!match&&match[2].trim()==='');
  }
  for(const [key,relative]of Object.entries(pkg.pnpm?.patchedDependencies??{}))check('Patch pnpm presente: '+key,set.has(relative));
  const render=fs.readFileSync(path.join(ROOT,'render.yaml'),'utf8');
  check('Blueprint Node e health reali',/runtime:\s*node/.test(render)&&/healthCheckPath:\s*\/_health/.test(render));
  check('Blueprint pin Node coerente',render.includes('value: "'+node+'"'));
  check('Blueprint installa gli strumenti di build',render.includes('corepack pnpm install --frozen-lockfile --prod=false'));
  check('Blueprint avvia il bundle di produzione',/startCommand:\s*node dist\/index\.js/.test(render)&&/value:\s*production/.test(render));
  check('Blueprint aspetta i check CI',/autoDeployTrigger:\s*checksPass/.test(render)&&!/^\s*autoDeploy:/m.test(render));
  check('Nessuna migrazione/seed nel Blueprint',!/^\s*(?:preDeployCommand|initialDeployHook|afterFirstDeployCommand):/m.test(render));
  const ci=fs.readFileSync(path.join(ROOT,'.github/workflows/ci.yml'),'utf8');
  check('CI completa senza passWithNoTests',['pnpm package:check','pnpm test:package','pnpm check','pnpm test:ci','pnpm build','pnpm smoke'].every(c=>ci.includes(c))&&!ci.includes('--passWithNoTests'));
  const docker=fs.readFileSync(path.join(ROOT,'Dockerfile'),'utf8');
  check('Docker ricostruisce e usa la stessa versione Node',docker.includes('FROM node:'+node+'-bookworm-slim AS build')&&docker.includes('RUN corepack pnpm build')&&docker.includes('USER node')&&!docker.includes('delete p.pnpm'));
  const ignore=fs.readFileSync(path.join(ROOT,'.gitignore'),'utf8');
  check('Segreti e output esclusi da Git',ignore.includes('.env.*')&&ignore.includes('!.env.example')&&ignore.includes('*.zip'));
  const ocr=fs.readFileSync(path.join(ROOT,'client/src/lib/ocr.ts'),'utf8');
  const language=ocr.match(/createWorker\(["']([^"']+)["']/)?.[1];
  check('Modello OCR coincide col codice',!!language&&set.has('client/public/tessdata/'+language+'.traineddata.gz'));
  check('Modello OCR gzip reale',zlib.gunzipSync(fs.readFileSync(path.join(ROOT,'client/public/tessdata/'+language+'.traineddata.gz'))).length>10000);
  for(const relative of ['client/public/fonts/OpenDyslexic-Regular.ttf','client/public/fonts/OpenDyslexic-Bold.ttf'])check('Font PDF binario reale: '+relative,fs.statSync(path.join(ROOT,relative)).size>10000);
  report.cropper=cropGuideCheck(ROOT);
  report.dedicatedEmbedCopiesIdentical=sha256(fs.readFileSync(path.join(ROOT,'cornice-dinamica/embed-latino-facile-dedicata.html')))===sha256(fs.readFileSync(path.join(ROOT,'client/public/cornice-test/embed-latino-facile-dedicata.html')));
  check('Cornice sorgente e copia pubblica allineate',report.dedicatedEmbedCopiesIdentical);
  if(fs.existsSync(path.join(ROOT,'VARIANTE-DA-ADATTARE.md')))report.warnings.push('Variante in bozza: questi controlli non attestano un adattamento linguistico completato.');
  report.warnings.push('Scansione segreti per firme note, non audit di sicurezza completo.');
  report.ok=true;
} catch(error) {report.error=error.message;process.exitCode=1;}
report.checkCount=report.checks.length;
writeReport(path.join(ROOT,'.cache/package-check.json'),report);
console.log(JSON.stringify({ok:report.ok,files:report.filesChecked,links:report.localLinksChecked,checks:report.checkCount,cropper:report.cropper,warnings:report.warnings,error:report.error},null,2));
