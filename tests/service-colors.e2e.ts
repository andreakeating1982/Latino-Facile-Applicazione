import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import superjson from 'superjson';
import {optionColor} from '../server/analyzer/index';
import {CASE_COLORS,MOOD_COLORS,SERVICE_COLORS,legendExplanationColor,shadeForNumber,colorForEnclitic,type AnalysisOption,type TokenData} from '../shared/types';
// Test di rendering/corrispondenza: risposte API simulate, nessuna IA reale.
const BASE=process.env.COLOR_QA_BASE_URL??'http://127.0.0.1:3000';
const OUT=process.env.COLOR_QA_OUTPUT??'/tmp/service-colors-qa';
await fs.mkdir(OUT,{recursive:true});
const samples:[string,Partial<AnalysisOption>,string?][]=[
 ['Nunc',{pos:'avverbio'}],['in',{pos:'preposizione'}],['villa',{pos:'nome',case:'ablativo',number:'singolare'}],
 ['puer',{pos:'nome',case:'nominativo',number:'singolare'}],['et',{pos:'congiunzione'}],
 ['puella',{pos:'nome',case:'nominativo',number:'singolare'}],['legunt',{pos:'verbo',mood:'indicativo'}],
 ['mecum',{pos:'pronome',case:'ablativo',number:'singolare'},'cum'],
 ['puellamque',{pos:'nome',case:'accusativo',number:'singolare'},'que'],
 ['ignotum',{pos:'sconosciuto'}],
];
const tokens:TokenData[]=samples.map(([word,attrs,suffix])=>{
 const o={lemma:word.toLowerCase(),form:word.toLowerCase(),summary:'',translation:'',freq:1,raw:'',desc:attrs.pos,...attrs} as AnalysisOption;
 return {text:word,word:word.toLowerCase(),trailing:'',isPunct:false,analysis:{word:word.toLowerCase(),display:word,options:[o],selected:0,category:o.pos,color:optionColor(o),label:o.desc,source:'manuale',number:o.number,...(suffix?{suffisso:{testo:suffix,colore:colorForEnclitic(suffix)}}:{})}};
});
const sentences=[{tokens}];
const css=(hex:string)=>`rgb(${[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)).join(', ')})`;
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const results:unknown[]=[];
for(const scenario of [{name:'desktop',width:1280,height:1000},{name:'mobile',width:393,height:850}]){
 const context=await browser.newContext({viewport:{width:scenario.width,height:scenario.height},hasTouch:scenario.name==='mobile',isMobile:scenario.name==='mobile'});
 const page=await context.newPage();const checks:{name:string;ok:boolean}[]=[];const errors:string[]=[];
 const check=(name:string,ok:boolean)=>{checks.push({name,ok});if(!ok)throw new Error(scenario.name+': '+name);};
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/trpc/**',async route=>{
  const url=new URL(route.request().url());const paths=url.pathname.split('/api/trpc/')[1].split(',');
  const data=paths.map(path=>({result:{data:superjson.serialize(path==='latino.analyze'?{sentences,unknownWords:[],apiUsed:false,colorSource:'regole'}:path==='latino.translate'?{coloredSentences:sentences,lines:['Esempio di verifica dei colori.'],source:'ai',colorSource:'ai'}:null)}}));
  await route.fulfill({contentType:'application/json',body:JSON.stringify(url.searchParams.get('batch')==='1'?data:data[0])});
 });
 try{
  await page.goto(BASE+'/app?nome=Colori&cognome=Prova&classe=2A');
  await page.locator('textarea').fill(samples.map(x=>x[0]).join(' '));
  await page.getByRole('button',{name:/Colora la frase con l.intelligenza artificiale/i}).click();
  const chip=(word:string)=>page.getByRole('button',{name:new RegExp('^Cambia colore o sottolineatura di '+word+'(?:,|$)')});
  await chip('nunc').waitFor();
  const service=[['nunc','avverbio','Avverbi'],['in','preposizione','Preposizioni'],['et','congiunzione','Congiunzioni']] as const;
  for(const [word,key,label]of service){
   const expected=css(SERVICE_COLORS[key]);
   check(word+' colore automatico',await chip(word).evaluate(el=>getComputedStyle(el).backgroundColor)===expected);
   check(word+' testo a contrasto',await chip(word).evaluate(el=>getComputedStyle(el).color)===css(key==='preposizione'?'#2e2018':'#fff7ec'));
   const dot=page.getByText(label.toUpperCase(),{exact:true});
   check(label+' legenda',await dot.evaluate(el=>getComputedStyle(el.closest('[role=listitem]')!.querySelector('.legend-dot')!).backgroundColor)===expected);
   check(label+' didascalia leggibile',await dot.evaluate(el=>getComputedStyle(el.nextElementSibling!).color)===css(legendExplanationColor(SERVICE_COLORS[key])));
   await chip(word).click();const pick=page.getByRole('button',{name:'Colore '+label,exact:true});
   check(label+' palette',await pick.locator('span').first().evaluate(el=>getComputedStyle(el).backgroundColor)===expected);
   check(label+' unica scelta attiva',await page.locator('[role=dialog] [aria-pressed=true]').count()===1&&await pick.getAttribute('aria-pressed')==='true');
   await pick.click();
   check(word+' scelta manuale',await chip(word).evaluate(el=>getComputedStyle(el).backgroundColor)===expected);
  }
  check('indicativo invariato',await chip('legunt').evaluate(el=>getComputedStyle(el).backgroundColor)===css(MOOD_COLORS.indicativo));
  check('caso singolare invariato',await chip('puer').evaluate(el=>getComputedStyle(el).backgroundColor)===css(shadeForNumber(CASE_COLORS.nominativo,'singolare')));
  for(const word of ['mecum','puellamque'])check(word+' suffisso UI resta nero/bianco',await chip(word).locator('span[style*="color"]').last().evaluate(el=>['rgb(255, 247, 236)','rgb(26, 26, 26)'].includes(getComputedStyle(el).color)));
  const download=page.waitForEvent('download');await page.getByRole('button',{name:/SCARICA IL PDF/i}).click();await (await download).saveAs(OUT+'/'+scenario.name+'.pdf');
  check('PDF da pulsante reale',(await fs.stat(OUT+'/'+scenario.name+'.pdf')).size>5000);
  await page.screenshot({path:OUT+'/'+scenario.name+'.png',fullPage:true});
  // Ricolora un nome: il colore manuale non deve essere schiarito come il caso.
  for(const [,key,label]of service){
   await chip('puer').click();await page.getByRole('button',{name:'Colore '+label,exact:true}).click();
   check('nome ricolorato '+label,await chip('puer').evaluate(el=>getComputedStyle(el).backgroundColor)===css(SERVICE_COLORS[key]));
   if(key==='preposizione'){
    check('nome in grigio chiaro testo scuro',await chip('puer').evaluate(el=>getComputedStyle(el).color)===css('#2e2018'));
    const lightPdf=page.waitForEvent('download');await page.getByRole('button',{name:/SCARICA IL PDF/i}).click();await (await lightPdf).saveAs(OUT+'/'+scenario.name+'-manual-light.pdf');
   }
  }
  check('sconosciuta nera conserva testo bianco',await chip('ignotum').evaluate(el=>getComputedStyle(el).color)===css('#FFFFFF'));
  await chip('ignotum').click();await page.getByRole('button',{name:'Colore Preposizioni',exact:true}).click();
  check('sconosciuta ricolorata chiara leggibile',await chip('ignotum').evaluate(el=>getComputedStyle(el).backgroundColor)===css(SERVICE_COLORS.preposizione)&&await chip('ignotum').evaluate(el=>getComputedStyle(el).color)===css('#2e2018'));
  const manualDownload=page.waitForEvent('download');await page.getByRole('button',{name:/SCARICA IL PDF/i}).click();await (await manualDownload).saveAs(OUT+'/'+scenario.name+'-manual.pdf');
  await page.getByRole('button',{name:'Cambia la modalità di lettura',exact:true}).click();
  for(const [word,key]of service)check(word+' colore mantenuto in modalità lettura',await chip(word).evaluate(el=>getComputedStyle(el).backgroundColor)===css(SERVICE_COLORS[key]));
  check('nessun errore JS',errors.length===0);
  results.push({scenario:scenario.name,checks,ok:true});
 }catch(e){results.push({scenario:scenario.name,checks,ok:false,error:String(e)});process.exitCode=1;}
 await context.close();
}
await browser.close();await fs.writeFile(OUT+'/results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));

