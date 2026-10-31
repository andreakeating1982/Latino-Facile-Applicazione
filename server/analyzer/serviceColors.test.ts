import { describe, it, expect } from 'vitest';
import { SERVICE_COLORS, SERVICE_LIGHT_OUTLINE_COLOR, isLightServiceColor, legendExplanationColor, POS_COLORS, LEGEND_ITEMS, CASE_COLORS, MOOD_COLORS, colorForCategory, colorForEnclitic, shadeForNumber, numeroPerSfumatura, type PosCategory, type AnalysisOption, type SentenceGroup } from '../../shared/types';
import { optionColor, analyzeText } from './index';
import { applyRoleOverrides } from './translationColors';
const entries = Object.entries(SERVICE_COLORS) as [keyof typeof SERVICE_COLORS, string][];
function luminance(hex: string) {
 const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4);
 return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;
}
function contrast(a:string,b:string){const [min,max]=[luminance(a),luminance(b)].sort((a,b)=>a-b);return (max+.05)/(min+.05);}
const option=(pos: PosCategory): AnalysisOption=>({lemma:'test',summary:'',translation:'',form:'test',pos,freq:1,desc:pos,raw:''});
describe('Parole di servizio — palette unica distinta',()=>{
 it('blu approvato invariato, due grigi lontani e nessuna duplicazione di casi o modi',()=>{
  expect(SERVICE_COLORS).toEqual({avverbio:'#0057D9',preposizione:'#BDBDBD',congiunzione:'#4A4A4A'});
  expect(contrast(SERVICE_COLORS.preposizione,SERVICE_COLORS.congiunzione)).toBeGreaterThanOrEqual(4.5);
  expect(new Set(entries.map(([,c])=>c)).size).toBe(3);
  const other=Object.values(CASE_COLORS).flatMap(c=>[c,shadeForNumber(c,'singolare'),shadeForNumber(c,'plurale')]).concat(Object.values(MOOD_COLORS));
  for(const [,c]of entries){expect(other.map(x=>x.toUpperCase())).not.toContain(c);expect(['#757575','#455A64']).not.toContain(c);}
 });
 it.each(entries)('%s identico in categoria, analizzatore e legenda, senza sfumature di numero',(pos,color)=>{
  expect(POS_COLORS[pos]).toBe(color);expect(colorForCategory(pos)).toBe(color);
  expect(optionColor(option(pos))).toBe(color);expect(LEGEND_ITEMS.find(i=>i.key===pos)?.color).toBe(color);
  expect(numeroPerSfumatura(pos,'plurale')).toBeNull();
 });
 it.each(entries)('%s con testo chip adattato e inchiostro/contorno PDF leggibile',(pos,color)=>{
  const text=pos==='preposizione'?'#2e2018':'#fff7ec';
  expect(contrast(color,text)).toBeGreaterThanOrEqual(4.5);
  const ink=isLightServiceColor(color)?SERVICE_LIGHT_OUTLINE_COLOR:color;
  expect(contrast(ink,'#FFFFFF')).toBeGreaterThanOrEqual(4.5);
 });
 it('le didascalie dei due grigi non vengono schiarite fino a scomparire',()=>{
  for(const pos of ['preposizione','congiunzione'] as const){
   const ink=legendExplanationColor(SERVICE_COLORS[pos]);
   expect(contrast(ink,'#FFFFFF')).toBeGreaterThanOrEqual(4.5);
   expect(contrast(ink,'#fff7ec')).toBeGreaterThanOrEqual(4.5);
  }
  expect(isLightServiceColor(SERVICE_COLORS.avverbio)).toBe(false);
  expect(isLightServiceColor(SERVICE_COLORS.congiunzione)).toBe(false);
 });
 it.each(entries)('ruolo IA %s usa la palette corrente senza chiamate IA',(pos,color)=>{
  const data:SentenceGroup[]=[{tokens:[{text:'test',word:'test',trailing:'',isPunct:false,analysis:{word:'test',display:'test',options:[option('sconosciuto')],selected:0,category:'sconosciuto',color:'#000000',label:'',source:'manuale'}}]}];
  applyRoleOverrides(data,{test:pos});expect(data[0].tokens[0].analysis?.color).toBe(color);
 });
 it('tutti i precedenti casi e modi restano identici',()=>{
  expect(CASE_COLORS).toEqual({nominativo:'#E53935',genitivo:'#FFB300',dativo:'#00ACC1',accusativo:'#43A047',vocativo:'#3949AB',ablativo:'#8E24AA'});
  expect(MOOD_COLORS.indicativo).toBe('#EF6C00');expect(MOOD_COLORS.congiuntivo).toBe('#AD1457');expect(MOOD_COLORS.infinito).toBe('#795548');
 });
 it.each(['que','ve','ne','cum'])('suffisso %s segue la nuova legenda',ending=>expect(colorForEnclitic(ending)).toBe(ending==='cum'?SERVICE_COLORS.preposizione:SERVICE_COLORS.congiunzione));
 it('enclitiche deterministiche hanno colori correnti senza cambiare la base',async()=>{
  const data=await analyzeText('Video mecum. Audio amasne. Habeo tresve.');
  applyRoleOverrides(data.sentences,{});
  const words=data.sentences.flatMap(s=>s.tokens);
  for(const [word,suffix]of [['mecum','cum'],['amasne','ne'],['tresve','ve']]){
   const a=words.find(t=>t.word.toLowerCase()===word)?.analysis;
   expect(a?.suffisso).toEqual({testo:suffix,colore:colorForEnclitic(suffix)});
  }
 });
});

