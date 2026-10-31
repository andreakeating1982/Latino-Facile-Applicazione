#!/usr/bin/env node
/** Copia locale sicura da commit pulito. Identità separata, motore NON adattato. */
import fs from 'node:fs';
import path from 'node:path';
import {ROOT,readJson,gitRoot,git,portableFiles,privatePath,ensureInside,writeReport} from './package-lib.mjs';

const usage='node scripts/clone-app.mjs --target ../nuova-app --name nuova-app --title "NUOVA APP" [--url https://dominio/]';
try {
  const args=process.argv.slice(2),opts={};
  if(args.includes('--help')){console.log(usage);process.exit(0);}
  for(let i=0;i<args.length;i+=2) {
    if(!['--target','--name','--title','--url'].includes(args[i])||!args[i+1]||opts[args[i]])throw new Error('Argomento non valido. '+usage);
    opts[args[i]]=args[i+1];
  }
  const name=opts['--name'],title=opts['--title'],targetArg=opts['--target'];
  if(!name||!/^[a-z0-9][a-z0-9-]{1,62}$/.test(name)||!title||title.length>100||/[\r\n]/.test(title)||!targetArg)throw new Error(usage);
  const target=path.resolve(process.cwd(),targetArg);
  if(target===ROOT||target.startsWith(ROOT+path.sep))throw new Error('La destinazione deve essere fuori dalla sorgente.');
  if(fs.existsSync(target))throw new Error('Destinazione già esistente: nessun file sarà sovrascritto.');
  if(!gitRoot(ROOT))throw new Error('Inizializzare una repository locale e salvare un primo commit della sorgente.');
  if(git(ROOT,'status','--porcelain','--untracked-files=normal').toString().trim())throw new Error('Sorgente non pulita: rivedere e committare le modifiche prima di clonare.');
  const commit=git(ROOT,'rev-parse','HEAD').toString().trim();
  const entries=git(ROOT,'ls-tree','-r','-z','HEAD').toString().split('\0').filter(Boolean);
  for(const entry of entries) {
    const [info,relative]=entry.split('\t');
    if(!/^100(?:644|755) blob /.test(info)||privatePath(relative))throw new Error('File non clonabile: '+relative);
  }
  const files=portableFiles(ROOT,{committedOnly:true});
  const sourceMeta=readJson(path.join(ROOT,'manifest.json'));
  let url='https://da-configurare.invalid/';
  if(opts['--url']) {
    const parsed=new URL(opts['--url']);
    if(parsed.protocol!=='https:'||parsed.username||parsed.password||parsed.search||parsed.hash||parsed.pathname!=='/')throw new Error('--url richiede una origine HTTPS senza credenziali, query o sottopercorsi.');
    url=parsed.origin+'/';
  }
  fs.mkdirSync(target,{recursive:true});
  for(const relative of files) {
    const output=ensureInside(target,relative);
    fs.mkdirSync(path.dirname(output),{recursive:true});
    fs.writeFileSync(output,git(ROOT,'show','HEAD:'+relative));
    fs.chmodSync(output,fs.statSync(path.join(ROOT,relative)).mode&0o777);
  }
  const pkg=readJson(path.join(target,'package.json'));
  pkg.name=name;pkg.version='0.1.0';pkg.description=title+' — bozza da adattare, derivata da '+sourceMeta.name;
  writeReport(path.join(target,'package.json'),pkg);
  const meta=readJson(path.join(target,'manifest.json'));
  meta.sourceApp={name:sourceMeta.name,sourceCommit:commit,sourceProduction:sourceMeta.release,languageEngine:sourceMeta.development?.languageEngine??'latin',readmeSnapshot:'docs/storico/README-SORGENTE-CLONE.md.txt'};
  meta.name=name;meta.version=pkg.version;meta.description=pkg.description;meta.scripts=pkg.scripts;
  meta.release={label:'draft-not-deployed',date:null,deploymentId:null,statusAtVerification:'not-deployed',productionUrl:null,codeCommit:null,verification:{}};
  meta.development={status:'draft-identity-only',languageEngine:'latin',serviceColors:sourceMeta.development?.serviceColors,portableGuide:'PHOTO-CROP-CLONABILE.md',changes:'Identità separata, nessun adattamento linguistico o pubblicazione implicito.'};
  meta.docs.currentRelease='VARIANTE-DA-ADATTARE.md';
  meta.export={...meta.export,runtimeMatchesProduction:false,applicationSourcesMatchSourceProduction:false,productionDeploymentId:null,targetUrl:url,identityOnlyClone:true,note:'Bozza locale: motore/prompt/OCR ancora latini. Nessuna chiave, database, cronologia Git o pubblicazione ereditati.'};
  meta.notes=['Leggere VARIANTE-DA-ADATTARE.md e ADATTARE.md prima di dichiarare completata questa variante.','I test della sorgente e i suoi metadati di rilascio sono solo provenienza, non verifiche della nuova lingua.'];
  writeReport(path.join(target,'manifest.json'),meta);
  const escape=value=>value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;').replaceAll('{','&#123;').replaceAll('}','&#125;');
  const htmlFile=path.join(target,'client/index.html');let html=fs.readFileSync(htmlFile,'utf8');
  const oldTitle=html.match(/<title>(.*?)<\/title>/s)?.[1]??'LATINO FACILE';
  html=html.replace(/<title>.*?<\/title>/s,()=>'<title>'+escape(title)+'</title>');
  html=html.replace(/(<meta name="description" content=")[^"]*("\s*\/>)/,(_match,start,end)=>start+escape('Bozza '+title+': attività da adattare dalla sorgente latina.')+end);
  fs.writeFileSync(htmlFile,html);
  const welcomeFile=path.join(target,'client/src/pages/WelcomePage.tsx');let welcome=fs.readFileSync(welcomeFile,'utf8');
  if(!/<h1\b[^>]*>\s*[^<]+\s*<\/h1>/.test(welcome))throw new Error('Titolo Welcome non riconosciuto; copia creata ma identità da controllare.');
  welcome=welcome.replace(/(<h1\b[^>]*>\s*)[^<]+?(\s*<\/h1>)/,(_match,start,end)=>start+escape(title)+end);
  fs.writeFileSync(welcomeFile,welcome);
  const renderFile=path.join(target,'render.yaml');let render=fs.readFileSync(renderFile,'utf8');
  render=render.replace(/^(\s+name:)\s*[^\n]+/m,'$1 '+name);fs.writeFileSync(renderFile,render);
  const sourceUrl=(sourceMeta.release?.productionUrl??sourceMeta.export?.targetUrl??'').replace(/\/$/,'');
  let frameCount=0;
  for(const relative of files.filter(f=>f.endsWith('.html')&&(f.startsWith('cornice-dinamica/')||f.startsWith('client/public/cornice-test/')))) {
    const file=path.join(target,relative);let frame=fs.readFileSync(file,'utf8');
    if(sourceUrl)frame=frame.split(sourceUrl).join(url.replace(/\/$/,''));
    frame=frame.replace(/(var APP_URL\s*=\s*)["'][^"']*["']/g,(_match,start)=>start+JSON.stringify(url));
    frame=frame.split(oldTitle).join(escape(title));
    fs.writeFileSync(file,frame);frameCount++;
  }
  const sourceReadme=path.join(target,'docs/storico/README-SORGENTE-CLONE.md.txt');
  fs.mkdirSync(path.dirname(sourceReadme),{recursive:true});fs.writeFileSync(sourceReadme,fs.readFileSync(path.join(target,'README.md')));
  const draft=`# ${title} — bozza da adattare\n\nQuesta copia deriva da **${sourceMeta.name}**, commit ${commit}. Non è una nuova app già pubblicata o linguisticamente adattata.\n\n## Da completare\n\n- [ ] Definire attività e lingua del contenuto; il motore attuale è ancora LATINO.\n- [ ] Adattare analizzatore, normalizzazione, ruoli, prompt, glossari, OCR e traduzione secondo [ADATTARE.md](ADATTARE.md).\n- [ ] Rivedere esempi e testi, test attesi e PDF; non ereditare percentuali o verifiche della sorgente.\n- [ ] Mantenere accessibilità, cropper e protocollo della cornice.\n- [ ] Sostituire l'URL cornice ${url} con il dominio realmente assegnato; nessun servizio è stato creato.\n- [ ] Configurare chiavi proprie soltanto nella destinazione, non nel repository.\n- [ ] Eseguire package:check, check, test:ci, build, smoke e test della nuova lingua/dispositivi.\n- [ ] Creare una repository separata e pubblicare soltanto dopo autorizzazione.\n\nIl namespace API e i dati OCR sono ancora quelli della sorgente. I quaderni PDF statici rimangono asset storici della sorgente, non materiale automaticamente valido per questa nuova app.\n`;
  fs.writeFileSync(path.join(target,'VARIANTE-DA-ADATTARE.md'),draft);
  fs.writeFileSync(path.join(target,'README.md'),`# ${title}\n\n> **BOZZA — identità separata, motore ancora LATINO.** Nessun deploy e nessun adattamento linguistico implicito.\n\nLeggere [VARIANTE-DA-ADATTARE.md](VARIANTE-DA-ADATTARE.md), poi [ADATTARE.md](ADATTARE.md). Le verifiche della sorgente registrate in manifest.sourceApp non certificano questa variante.\n\n## Avvio\n\n\`\`\`bash\ncorepack pnpm install --frozen-lockfile --prod=false\ncp .env.example .env\ncorepack pnpm package:check\ncorepack pnpm dev\n\`\`\`\n\nNode/pnpm sono fissati in .node-version e packageManager. Nessuna chiave o DB della sorgente è stata copiata.\n\n## Guide incluse\n\n- [AGENTS.md](AGENTS.md): istruzioni per agenti IA.\n- [REBUILD.md](REBUILD.md): ricostruzione della base.\n- [RENDER.md](RENDER.md): GitHub e nuovo servizio Render.\n- [ACCESSIBILITA.md](ACCESSIBILITA.md): misure da preservare.\n- [OCR-FOTO.md](OCR-FOTO.md), [SCROLLING-MOBILE.md](SCROLLING-MOBILE.md): foto/cropper.\n- [docs/STRUTTURA.md](docs/STRUTTURA.md): mappa del pacchetto.\n- [docs/ESPORTAZIONE.md](docs/ESPORTAZIONE.md): nuova esportazione dal proprio commit.\n\nLe guide tecniche descrivono ancora la base latina: rivederle dopo l'adattamento, senza attribuire a questa app il rilascio pubblico della sorgente.\n`);
  const agentsFile=path.join(target,'AGENTS.md');fs.writeFileSync(agentsFile,'> **VARIANTE IN BOZZA:** leggere prima [VARIANTE-DA-ADATTARE.md](VARIANTE-DA-ADATTARE.md). I riferimenti al rilascio pubblico sotto descrivono la sorgente, non questa copia.\n\n'+fs.readFileSync(agentsFile,'utf8'));
  writeReport(path.join(target,'docs/portabilita/clone-origin.json'),{source:sourceMeta.name,commit,targetName:name,identityOnly:true,languageEngine:'latin',frameUrl:url,filesCopied:files.length,framesUpdated:frameCount,secretsCopied:false,gitHistoryCopied:false,deployed:false});
  console.log(JSON.stringify({ok:true,target,name,title,filesCopied:files.length,framesUpdated:frameCount,identityOnly:true,languageEngine:'latin',frameUrl:url,warning:'BOZZA: completare VARIANTE-DA-ADATTARE.md; nessun adattamento linguistico o deploy eseguito.'},null,2));
} catch(error) {console.error(error.message);process.exitCode=1;}
