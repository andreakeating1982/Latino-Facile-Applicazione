#!/usr/bin/env node
/** Avvio reale di dist/index.js, isolato da .env/credenziali/database. */
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import zlib from 'node:zlib';
import {spawn} from 'node:child_process';
import {ROOT,sha256,writeReport} from './package-lib.mjs';

const report={ok:false,checks:[],credentialsUsed:false,databaseUsed:false,externalFetchBlocked:true};
const record=(name,ok,detail)=>{report.checks.push({name,ok,...(detail===undefined?{}:{detail})});if(!ok)throw new Error(name);};
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const socket=net.createServer();
await new Promise((resolve,reject)=>{socket.once('error',reject);socket.listen(0,'127.0.0.1',resolve);});
const port=socket.address().port;
await new Promise(resolve=>socket.close(resolve));
let child,logs='',spawnError=null;
const env={};
for(const name of ['PATH','HOME','USERPROFILE','SYSTEMROOT','WINDIR','TEMP','TMP','TMPDIR','LANG','LC_ALL','TZ'])if(process.env[name])env[name]=process.env[name];
Object.assign(env,{NODE_ENV:'production',PORT:String(port),DOTENV_CONFIG_PATH:path.join(ROOT,'.cache/does-not-exist-smoke.env'),DATABASE_URL:'',BETTER_AUTH_SECRET:'',EASY_PEASY_API_KEY:'',DEEPL_API_KEY:'',TRUSTED_ORIGINS:''});
const base='http://127.0.0.1:'+port;
const get=async url=>{
  const response=await fetch(base+url,{signal:AbortSignal.timeout(15000)});
  return {response,body:Buffer.from(await response.arrayBuffer())};
};
try {
  record('Build server presente',fs.existsSync(path.join(ROOT,'dist/index.js')));
  record('Build client presente',fs.existsSync(path.join(ROOT,'dist/public/index.html')));
  child=spawn(process.execPath,['--import',path.join(ROOT,'scripts/local-only-fetch.mjs'),path.join(ROOT,'dist/index.js')],{cwd:ROOT,env,stdio:['ignore','pipe','pipe']});
  child.on('error',error=>{spawnError=error;});
  for(const stream of [child.stdout,child.stderr])stream.on('data',chunk=>{logs=(logs+chunk.toString()).slice(-16000);});
  let healthy=false;
  for(let i=0;i<100;i++) {
    if(spawnError)throw spawnError;
    if(child.exitCode!==null)throw new Error('Server terminato prima dell’avvio: '+logs);
    try {const {response,body}=await get('/_health');if(response.status===200&&body.toString()==='OK'){healthy=true;break;}}catch{}
    await delay(150);
  }
  record('Health produzione su porta assegnata',healthy);
  const home=await get('/');
  record('Rotta / serve HTML',home.response.status===200&&/text\/html/i.test(home.response.headers.get('content-type')??'')&&home.body.includes(Buffer.from('<div id="root">')));
  const app=await get('/app');record('Rotta SPA /app servita direttamente',app.response.status===200&&sha256(app.body)===sha256(home.body));
  const js=home.body.toString().match(/<script[^>]+src=["']([^"']+\.js)["']/)?.[1];
  record('Bundle JavaScript dichiarato',!!js);
  const bundle=await get(js);record('Bundle reale, non HTML di fallback',bundle.response.status===200&&/javascript/.test(bundle.response.headers.get('content-type')??'')&&bundle.body.length>10000&&!bundle.body.toString().startsWith('<!doctype'));
  const publicRoot=path.join(ROOT,'client/public');const assets=[];
  const visit=dir=>{for(const entry of fs.readdirSync(dir,{withFileTypes:true})){if(entry.name.startsWith('.'))continue;const file=path.join(dir,entry.name);if(entry.isDirectory())visit(file);else assets.push(file);}};
  visit(publicRoot);
  for(const file of assets) {
    const relative=path.relative(publicRoot,file).split(path.sep).join('/');const {response,body}=await get('/'+relative);
    record('Asset reale identico: '+relative,response.status===200&&sha256(body)===sha256(fs.readFileSync(file)));
    if(relative.startsWith('fonts/'))record('CORS font: '+relative,response.headers.get('access-control-allow-origin')==='*');
    if(relative.endsWith('.traineddata.gz'))record('Modello OCR gzip valido: '+relative,zlib.gunzipSync(body).length>10000);
  }
  report.publicAssetsVerified=assets.length;
  const analyzeResponse=await fetch(base+'/api/trpc/latino.analyze?batch=1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({'0':{json:{text:'Nunc in villa puer et puella legunt.'}}}),signal:AbortSignal.timeout(20000)});
  const data=await analyzeResponse.json();const analysis=data[0]?.result?.data?.json;
  record('Endpoint analisi con motore reale',analyzeResponse.status===200&&Array.isArray(analysis?.sentences)&&analysis.sentences.length===1);
  const tokens=analysis.sentences.flatMap(sentence=>sentence.tokens);
  for(const [word,color]of [['nunc','#0057D9'],['in','#BDBDBD'],['et','#4A4A4A']]) {
    const token=tokens.find(t=>t.word.toLowerCase()===word);
    record('Colore reale atteso: '+word,token?.analysis?.color.toUpperCase()===color);
  }
  record('Analisi iniziale dichiara regole',analysis.colorSource==='regole');
  const auth=await get('/api/auth/get-session');
  record('Login opzionale assente senza DB',auth.response.status===503&&JSON.parse(auth.body.toString()).error==='Auth service unavailable');
  const photo=await fetch(base+'/api/ai/transcribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB',kind:'photo'}),signal:AbortSignal.timeout(10000)});
  record('Foto IA indisponibile come previsto senza chiave',photo.status===503);
  report.ok=true;
} catch(error) {report.error=error.message;report.serverLog=logs;process.exitCode=1;}
finally {
  if(child&&child.exitCode===null) {
    child.kill('SIGTERM');
    await Promise.race([new Promise(resolve=>child.once('exit',resolve)),delay(2500)]);
    if(child.exitCode===null)child.kill('SIGKILL');
  }
}
report.checkCount=report.checks.length;
writeReport(process.env.SMOKE_OUTPUT??path.join(ROOT,'.cache/production-smoke.json'),report);
console.log(JSON.stringify({ok:report.ok,checks:report.checkCount,publicAssets:report.publicAssetsVerified,error:report.error,credentialsUsed:false,databaseUsed:false,externalFetchBlocked:true},null,2));
