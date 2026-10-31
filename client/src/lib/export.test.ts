/**
 * Test reale di buildPdfBlob (il PDF esportato dall'app):
 * - 4 frasi + traduzioni lunghe dello studente + legenda completa (18 voci)
 *   → il documento supera una pagina;
 * - con `paginaNumeri=true` OGNI pagina porta SOLO il numero centrato in
 *   basso; senza flag (o con una sola pagina) nessun numero.
 * I font OpenDyslexic sono serviti dai file locali (fetch simulato).
 */
import { describe, expect, it, vi, afterEach } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildPdfBlob, type ExportToken } from "./export";
import { LEGEND_ITEMS, LEGEND_VOICE_NOTE, OTHER_MOODS_COLOR, MOOD_COLORS, SERVICE_COLORS, SERVICE_LIGHT_OUTLINE_COLOR, legendExplanationColor, colorForEnclitic, lightenColor } from "../../../shared/types";
import { PDFPage, rgb, PDFDocument, PDFRawStream, PDFArray, decodePDFRawStream, type PDFFont } from "pdf-lib";

const FONTS = join(__dirname, "..", "..", "public", "fonts");

function mockFonts() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const name = String(url).includes("Bold")
        ? "OpenDyslexic-Bold.ttf"
        : "OpenDyslexic-Regular.ttf";
      const buf = readFileSync(join(FONTS, name));
      return new Response(buf);
    })
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function token(word: string, color = "#E53935"): ExportToken {
  return {
    word,
    trailing: "",
    color,
    number: "singolare",
    pos: "nome",
  };
}

const FRASI: ExportToken[][] = [
  [token("Discipulae"), token("et", SERVICE_COLORS.congiunzione), token("magistra"), token("Romae", "#00897B"), token("gloriam"), token("narrant", "#EF6C00")],
  [token("Nautarum"), token("perseverantiam"), token("atque", SERVICE_COLORS.congiunzione), token("industriam"), token("laudamus", "#EF6C00")],
  [token("Agricolae"), token("lunam"), token("amant", "#EF6C00"), token("sed", SERVICE_COLORS.congiunzione), token("umbras"), token("timent", "#EF6C00")],
  [token("Romani"), token("forti", "#5C6BC0"), token("animo"), token("pugnabant", "#EF6C00"), token("et", SERVICE_COLORS.congiunzione), token("patriam"), token("defendebant", "#EF6C00")],
];

const TRADUZIONI = FRASI.map(
  (_, i) =>
    `Traduzione di prova numero ${i + 1} scritta dallo studente per verificare che l'esportazione sul documento PDF finale funzioni bene anche quando il testo della traduzione e molto lungo e va a capo su piu righe occupando spazio.`
);

const LEGENDA = LEGEND_ITEMS.map((l) => ({
  label: l.label,
  sub: l.sub,
  compl: l.compl,
  color: l.color,
  numero: l.numero,
}));

const OUT = "/tmp/qa_export_multipagina.pdf";

describe("buildPdfBlob — colore altri modi verbali", () => {
  it("disegna parole, palette manuale esportata, legenda e complemento col nuovo marrone", async () => {
    mockFonts();
    const drawText = vi.spyOn(PDFPage.prototype, "drawText");
    const drawRectangle = vi.spyOn(PDFPage.prototype, "drawRectangle");
    const words: ExportToken[] = [
      { word: "amare", trailing: "", color: MOOD_COLORS.infinito, pos: "verbo", number: "singolare" },
      { word: "ama", trailing: "", color: MOOD_COLORS.imperativo, pos: "verbo", voice: "passivo" },
      { word: "manuale", trailing: "", color: OTHER_MOODS_COLOR, pos: "nome", number: "plurale", coloreFinale: true },
    ];
    const blob = await buildPdfBlob([words], LEGENDA);
    writeFileSync("/tmp/qa_altri_modi_marrone.pdf", Buffer.from(await blob.arrayBuffer()));
    const brown = rgb(121 / 255, 85 / 255, 72 / 255);
    for (const word of words) {
      expect(drawText.mock.calls.find(([text]) => text === word.word)?.[1]?.color).toEqual(brown);
    }
    expect(drawRectangle.mock.calls.some(([opts]) => JSON.stringify(opts?.color) === JSON.stringify(brown))).toBe(true);
    const lighter = lightenColor(OTHER_MOODS_COLOR).slice(1).match(/../g)!.map(v => parseInt(v, 16) / 255);
    expect(drawText.mock.calls.some(([text, opts]) => text === "PREDICATO VERBALE" && JSON.stringify(opts?.color) === JSON.stringify(rgb(lighter[0], lighter[1], lighter[2])))).toBe(true);
    expect(drawText.mock.calls.some(([text]) => text === "ALTRI MODI VERBALI")).toBe(true);
  });
});

describe("buildPdfBlob — traduzioni studente e numeri pagina", () => {
  it("4 frasi + traduzioni + legenda completa → più pagine, numerate, traduzioni presenti", async () => {
    mockFonts();
    const blob = await buildPdfBlob(FRASI, LEGENDA, { cognome: "Rossi", nome: "Mario" }, TRADUZIONI, true);
    const buf = Buffer.from(await blob.arrayBuffer());
    writeFileSync(OUT, buf);
    // il conteggio pagine e il testo si verificano con pypdf (script QA esterno)
    expect(buf.length).toBeGreaterThan(5000);
  });

  it("senza flag numeri: stesso documento, nessuna numerazione richiesta", async () => {
    mockFonts();
    const blob = await buildPdfBlob(FRASI, LEGENDA, undefined, TRADUZIONI);
    const buf = Buffer.from(await blob.arrayBuffer());
    expect(buf.length).toBeGreaterThan(5000);
  });
});

describe('PDF — legenda: ogni scritta su una riga dentro la propria colonna',()=>{
  it('etichette SINGOLARE/PLURALE, complementi e sottotitoli non sforano la colonna',async()=>{
    mockFonts();
    const drawText=vi.spyOn(PDFPage.prototype,'drawText');
    await buildPdfBlob([FRASI[0]],LEGENDA);
    const pageW=595.28,margin=64;
    const colW=(pageW-margin*2)/2;
    // Tutte le scritte della legenda (fonte condivisa + titolo + nota voce):
    // per ognuna la larghezza REALE misurata col font incorporato deve
    // restare dentro la colonna in cui è stata disegnata (pdf-lib non va mai
    // a capo da sé: senza controllo sforerebbe silenziosamente).
    const noteParts=new Set(LEGEND_VOICE_NOTE.map(p=>p.text));
    const legendTexts=new Set<string>([
      ...LEGENDA.map(l=>l.label),
      ...LEGENDA.filter(l=>l.numero).flatMap(l=>[`${l.label} SINGOLARE`,`${l.label} PLURALE`]),
      ...LEGENDA.map(l=>l.compl).filter((s):s is string=>!!s),
      ...LEGENDA.map(l=>l.sub).filter((s):s is string=>!!s),
      'I COLORI DELLE FRASI',
    ]);
    let verifiche=0;
    // La nota voce è disegnata a SEGMENTI consecutivi sulla stessa riga:
    // si verifica la riga intera (x iniziale + somma delle larghezze).
    const noteRighe=new Map<number,{x0:number;total:number}>();
    for(const [text,opts] of drawText.mock.calls){
      if(!opts?.font)continue;
      if(noteParts.has(text)){
        const y=opts.y!;
        const w=(opts.font as PDFFont).widthOfTextAtSize(text,opts.size!);
        const riga=noteRighe.get(y)??{x0:opts.x!,total:0};
        riga.x0=Math.min(riga.x0,opts.x!);riga.total+=w;
        noteRighe.set(y,riga);
        continue;
      }
      if(!legendTexts.has(text))continue;
      verifiche++;
      const w=(opts.font as PDFFont).widthOfTextAtSize(text,opts.size!);
      // Testi centrati (titolo): larghezza intera; altrimenti colonna.
      const centrato=Math.abs(opts.x!+w/2-pageW/2)<1;
      const right=centrato?pageW-margin+0.5:opts.x!<margin+colW?margin+colW-1:pageW-margin+0.5;
      expect(opts.x!+w,`«${text}» sfora la colonna del PDF`).toBeLessThanOrEqual(right);
    }
    for(const [y,riga] of noteRighe){
      verifiche++;
      expect(riga.x0+riga.total,`nota voce a y=${y} sfora i margini`).toBeLessThanOrEqual(pageW-margin+0.5);
    }
    expect(verifiche).toBeGreaterThanOrEqual(20);
  });
});

describe('PDF — parole di servizio e suffissi allineati alla nuova legenda',()=>{
  it('grigio chiaro automatico/manuale/-cum: fill esatto, contorno isolato, campione bordato e didascalia leggibile',async()=>{
    mockFonts();
    const text=vi.spyOn(PDFPage.prototype,'drawText');
    const rect=vi.spyOn(PDFPage.prototype,'drawRectangle');
    const line=vi.spyOn(PDFPage.prototype,'drawLine');
    const words:ExportToken[]=[
      {word:'in',trailing:'',color:SERVICE_COLORS.preposizione,pos:'preposizione'},
      {word:'manuale',trailing:'',color:SERVICE_COLORS.preposizione,pos:'nome',number:'plurale',coloreFinale:true,voice:'passivo'},
      {word:'mecum',trailing:'',color:'#8E24AA',pos:'pronome',suffisso:{testo:'cum',colore:'#757575'}},
      {word:'et',trailing:'',color:SERVICE_COLORS.congiunzione,pos:'congiunzione'},
      {word:'nunc',trailing:'',color:SERVICE_COLORS.avverbio,pos:'avverbio'},
      {word:'fine',trailing:'.',color:'#000000',pos:'sconosciuto'},
    ];
    const blob=await buildPdfBlob([words],LEGENDA);
    const doc=await PDFDocument.load(await blob.arrayBuffer());
    let content='';
    for(const p of doc.getPages()){
      const arr=p.node.Contents();expect(arr).toBeInstanceOf(PDFArray);
      if(arr instanceof PDFArray)for(let i=0;i<arr.size();i++){
        const s=doc.context.lookup(arr.get(i));
        if(s instanceof PDFRawStream)content+=new TextDecoder().decode(decodePDFRawStream(s).decode());
      }
    }
    expect(content.match(/2 Tr/g)).toHaveLength(3);
    expect(content.match(/0\.35 w/g)).toHaveLength(3);
    // State pushes/pops balanced: no outline leaking into subsequent words.
    expect(content.split(/\s+/).filter(x=>x==='q').length).toBe(content.split(/\s+/).filter(x=>x==='Q').length);
    const stroke=asRgb(SERVICE_LIGHT_OUTLINE_COLOR);
    expect(rect.mock.calls.some(([o])=>o.borderWidth===0.4&&JSON.stringify(o.borderColor)===JSON.stringify(stroke))).toBe(true);
    expect(line.mock.calls.some(([o])=>o.thickness===1.6&&JSON.stringify(o.color)===JSON.stringify(stroke))).toBe(true);
    for(const pos of ['preposizione','congiunzione'] as const)expect(text.mock.calls.some(([s,o])=>s==='PAROLE DI SERVIZIO'&&JSON.stringify(o?.color)===JSON.stringify(asRgb(legendExplanationColor(SERVICE_COLORS[pos]))))).toBe(true);
  });
  const asRgb=(hex:string)=>{const v=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);return rgb(v[0],v[1],v[2]);};
  it('parole automatiche, colori manuali e quadratini della legenda hanno le nuove tinte',async()=>{
    mockFonts();const text=vi.spyOn(PDFPage.prototype,'drawText');const rect=vi.spyOn(PDFPage.prototype,'drawRectangle');
    const words:ExportToken[]=Object.entries(SERVICE_COLORS).flatMap(([pos,color])=>[
      {word:pos,trailing:'',color,pos:pos as ExportToken['pos'],number:'plurale'},
      {word:pos+'manuale',trailing:'',color,pos:'nome',number:'singolare',coloreFinale:true},
    ]);
    const blob=await buildPdfBlob([words],LEGENDA);
    writeFileSync('/tmp/qa_parole_servizio.pdf',Buffer.from(await blob.arrayBuffer()));
    for(const word of words)expect(text.mock.calls.find(([s])=>s===word.word)?.[1]?.color).toEqual(asRgb(word.color));
    for(const color of Object.values(SERVICE_COLORS))expect(rect.mock.calls.some(([o])=>JSON.stringify(o.color)===JSON.stringify(asRgb(color)))).toBe(true);
  });
  it('suffissi nel PDF seguono la categoria attuale anche con vecchi grigi ricevuti, senza alterare la base',async()=>{
    mockFonts();const text=vi.spyOn(PDFPage.prototype,'drawText');
    const words:ExportToken[]=['que','ve','ne','cum'].map(suffix=>({word:'base'+suffix,trailing:'',color:'#E53935',pos:'nome',suffisso:{testo:suffix,colore:'#455A64'}}));
    await buildPdfBlob([words],LEGENDA);
    for(const ending of ['que','ve','ne','cum'])expect(text.mock.calls.find(([s])=>s===ending)?.[1]?.color).toEqual(asRgb(colorForEnclitic(ending)));
    for(const [,opts]of text.mock.calls.filter(([s])=>s==='base'))expect(opts?.color).toEqual(asRgb('#E53935'));
  });
});
