/**
 * DIZIONARIO CURATO — integra e corregge Whitaker.
 *
 * ⚠️ NOTA: questo file è stato RICOSTRUITO in data 27/08/2026 perché la
 * versione originale non era mai stata committata (la regola `data/` del
 * .gitignore escludeva anche questa cartella). Contiene:
 *  1. i verbi/lacune dell'audit originale (alo, amo, celo, gallia, aperta…);
 *  2. le forme che Whitaker non riconosce affatto (occui, summus, pessimus,
 *     Oricum, Vesontio);
 *  3. le forme in cui l'analisi di default era sbagliata (vici → vinco).
 * Se disponi del file originale, sostituiscilo pure: la struttura attesa è
 * `Record<string, AnalysisOption[]>` (chiave = lemma/forma normalizzata).
 */

import type { AnalysisOption } from "../../../shared/types";

type Opt = AnalysisOption;

/** Verbo: costruisce l'opzione verbale con descrizione italiana */
function v(
  lemma: string,
  summary: string,
  translation: string,
  form: string,
  mood: Opt["mood"],
  tense: string,
  voice: Opt["voice"],
  person: Opt["person"],
  number: Opt["number"],
  desc: string,
  freq = 12
): Opt {
  return {
    lemma,
    summary,
    translation,
    form,
    pos: "verbo",
    mood,
    tense,
    voice,
    person,
    number,
    freq,
    desc,
    raw: `${tense?.toUpperCase()} ${voice?.toUpperCase()} ${mood?.toUpperCase()} ${person ?? 0} ${number === "singolare" ? "S" : "P"}`,
  };
}

/** Participio / forma verbale nominale (VPAR) */
function vpar(
  lemma: string,
  summary: string,
  translation: string,
  form: string,
  cs: Opt["case"],
  number: Opt["number"],
  gender: Opt["gender"],
  desc: string,
  freq = 10
): Opt {
  return {
    lemma,
    summary,
    translation,
    form,
    pos: "verbo",
    mood: "participio",
    tense: "perfetto",
    voice: "passivo",
    case: cs,
    number,
    gender,
    freq,
    desc,
    raw: `VPAR PERF PASSIVE ${cs?.toUpperCase() ?? "X"} ${number === "singolare" ? "S" : "P"} ${gender === "maschile" ? "M" : gender === "femminile" ? "F" : "N"}`,
  };
}

/** Nome: costruisce l'opzione nominale */
function n(
  lemma: string,
  summary: string,
  translation: string,
  form: string,
  cs: Opt["case"],
  number: Opt["number"],
  gender: Opt["gender"],
  desc: string,
  freq = 10
): Opt {
  return {
    lemma,
    summary,
    translation,
    form,
    pos: "nome",
    case: cs,
    number,
    gender,
    freq,
    desc,
    raw: `N ${cs?.toUpperCase() ?? "X"} ${number === "singolare" ? "S" : "P"} ${gender === "maschile" ? "M" : gender === "femminile" ? "F" : "N"}`,
  };
}

/** Aggettivo: costruisce l'opzione aggettivale */
function adj(
  lemma: string,
  summary: string,
  translation: string,
  form: string,
  cs: Opt["case"],
  number: Opt["number"],
  gender: Opt["gender"],
  desc: string,
  freq = 10
): Opt {
  return {
    lemma,
    summary,
    translation,
    form,
    pos: "aggettivo",
    case: cs,
    number,
    gender,
    degree: "positivo",
    freq,
    desc,
    raw: `ADJ ${cs?.toUpperCase() ?? "X"} ${number === "singolare" ? "S" : "P"} ${gender === "maschile" ? "M" : gender === "femminile" ? "F" : "N"} POS`,
  };
}

/* ------------------------------------------------------------------ */

export const OVERRIDES: Record<string, Opt[]> = {
  /* ---------- alo (nutrire, allevare) ---------- */
  alo: [
    v("alo, alere, alui, altum", "verbo · 3ª coniug.", "nutrire, allevare", "alo", "indicativo", "presente", "attivo", 1, "singolare", "indicativo presente, 1ª singolare", 12),
  ],
  alere: [
    v("alo, alere, alui, altum", "verbo · 3ª coniug.", "nutrire, allevare", "alere", "infinito", "presente", "attivo", undefined, undefined, "infinito presente attivo", 12),
  ],
  alui: [
    v("alo, alere, alui, altum", "verbo · 3ª coniug.", "nutrire, allevare", "alui", "indicativo", "perfetto", "attivo", 1, "singolare", "indicativo perfetto, 1ª singolare", 12),
  ],
  altum: [
    vpar("alo, alere, alui, altum", "forma verbale", "nutrire, allevare", "altum", "nominativo", "singolare", "neutro", "participio perfetto passivo (nominativo neutro singolare)", 10),
  ],

  /* ---------- amo (amare) ---------- */
  amo: [
    v("amo, amare, amavi, amatum", "verbo · 1ª coniug.", "amare", "amo", "indicativo", "presente", "attivo", 1, "singolare", "indicativo presente, 1ª singolare", 12),
  ],
  amare: [
    v("amo, amare, amavi, amatum", "verbo · 1ª coniug.", "amare", "amare", "infinito", "presente", "attivo", undefined, undefined, "infinito presente attivo", 12),
  ],
  amavi: [
    v("amo, amare, amavi, amatum", "verbo · 1ª coniug.", "amare", "amavi", "indicativo", "perfetto", "attivo", 1, "singolare", "indicativo perfetto, 1ª singolare", 12),
  ],
  amatum: [
    vpar("amo, amare, amavi, amatum", "forma verbale", "amare", "amatum", "nominativo", "singolare", "neutro", "participio perfetto passivo (nominativo neutro singolare)", 10),
  ],

  /* ---------- celo (nascondere) ---------- */
  celo: [
    v("celo, celare, celavi, celatum", "verbo · 1ª coniug.", "nascondere", "celo", "indicativo", "presente", "attivo", 1, "singolare", "indicativo presente, 1ª singolare", 12),
  ],
  celare: [
    v("celo, celare, celavi, celatum", "verbo · 1ª coniug.", "nascondere", "celare", "infinito", "presente", "attivo", undefined, undefined, "infinito presente attivo", 12),
  ],
  celavi: [
    v("celo, celare, celavi, celatum", "verbo · 1ª coniug.", "nascondere", "celavi", "indicativo", "perfetto", "attivo", 1, "singolare", "indicativo perfetto, 1ª singolare", 12),
  ],
  celatum: [
    vpar("celo, celare, celavi, celatum", "forma verbale", "nascondere", "celatum", "nominativo", "singolare", "neutro", "participio perfetto passivo (nominativo neutro singolare)", 10),
  ],

  /* ---------- occulo (nascondere) — perfetto MANCANTE in Whitaker ---------- */
  occui: [
    v("occulo, occulere, occului, occultum", "verbo · 3ª coniug.", "nascondere, coprire", "occui", "indicativo", "perfetto", "attivo", 1, "singolare", "indicativo perfetto, 1ª singolare", 10),
  ],

  /* ---------- vinco — «vici» letto da Whitaker come nome ---------- */
  vici: [
    v("vinco, vincere, vici, victum", "verbo · 3ª coniug.", "vincere", "vici", "indicativo", "perfetto", "attivo", 1, "singolare", "indicativo perfetto, 1ª singolare", 12),
  ],

  /* ---------- summus / pessimus — MANCANTI in Whitaker ---------- */
  summus: [
    adj("summus, summa, summum", "aggettivo · 1ª e 2ª decl.", "sommo, il più alto", "summus", "nominativo", "singolare", "maschile", "nominativo maschile singolare", 10),
  ],
  pessimus: [
    adj("pessimus, pessima, pessimum", "aggettivo · 1ª e 2ª decl.", "pessimo, il peggiore", "pessimus", "nominativo", "singolare", "maschile", "nominativo maschile singolare", 10),
  ],

  /* ---------- Gallia — glossario italiano + lettura corretta ---------- */
  gallia: [
    n("Gallia, Galliae", "nome proprio · 1ª decl.", "la Gallia", "gallia", "nominativo", "singolare", "femminile", "nominativo femminile singolare", 12),
  ],
  galliae: [
    n("Gallia, Galliae", "nome proprio · 1ª decl.", "la Gallia", "galliae", "genitivo", "singolare", "femminile", "genitivo femminile singolare", 12),
  ],
  galliam: [
    n("Gallia, Galliae", "nome proprio · 1ª decl.", "la Gallia", "galliam", "accusativo", "singolare", "femminile", "accusativo femminile singolare", 12),
  ],

  /* ---------- aperta — participio + aggettivo («aperto») ---------- */
  aperta: [
    adj("apertus, aperta, apertum", "aggettivo · 1ª e 2ª decl.", "aperto, scoperto", "aperta", "nominativo", "singolare", "femminile", "nominativo femminile singolare", 9),
    vpar("aperio, aperire, aperui, apertum", "forma verbale", "aprire", "aperta", "nominativo", "singolare", "femminile", "participio perfetto passivo (nominativo femminile singolare)", 9),
  ],

  /* ---------- urbs — «urbe» letto da Whitaker come dativo (è ablativo) ---------- */
  urbe: [
    n("urbs, urbis", "nome · 3ª decl.", "città", "urbe", "ablativo", "singolare", "femminile", "ablativo femminile singolare", 12),
  ],

  /* ---------- miles — «milites» letto da Whitaker come verbo (milito) ---------- */
  milites: [
    n("miles, militis", "nome · 3ª decl.", "il soldato", "milites", "nominativo", "plurale", "maschile", "nominativo maschile plurale", 12),
    n("miles, militis", "nome · 3ª decl.", "il soldato", "milites", "accusativo", "plurale", "maschile", "accusativo maschile plurale", 10),
  ],
  militem: [
    n("miles, militis", "nome · 3ª decl.", "il soldato", "militem", "accusativo", "singolare", "maschile", "accusativo maschile singolare", 12),
  ],
  militis: [
    n("miles, militis", "nome · 3ª decl.", "il soldato", "militis", "genitivo", "singolare", "maschile", "genitivo maschile singolare", 12),
  ],
  milite: [
    n("miles, militis", "nome · 3ª decl.", "il soldato", "milite", "ablativo", "singolare", "maschile", "ablativo maschile singolare", 12),
  ],

  /* ---------- pater — Whitaker legge «patres» solo come verbo (patro) e ignora i plurali ---------- */
  patres: [
    n("pater, patris", "nome · 3ª decl.", "il padre", "patres", "nominativo", "plurale", "maschile", "nominativo maschile plurale", 12),
    n("pater, patris", "nome · 3ª decl.", "il padre", "patres", "vocativo", "plurale", "maschile", "vocativo maschile plurale", 10),
    n("pater, patris", "nome · 3ª decl.", "il padre", "patres", "accusativo", "plurale", "maschile", "accusativo maschile plurale", 10),
  ],
  patrum: [
    n("pater, patris", "nome · 3ª decl.", "il padre", "patrum", "genitivo", "plurale", "maschile", "genitivo maschile plurale", 12),
  ],

  /* ---------- librum — Whitaker mette in testa il genitivo plurale di «libra» ---------- */
  librum: [
    n("liber, libri", "nome · 2ª decl.", "il libro", "librum", "accusativo", "singolare", "maschile", "accusativo maschile singolare", 12),
  ],

  patribus: [
    n("pater, patris", "nome · 3ª decl.", "il padre", "patribus", "dativo", "plurale", "maschile", "dativo maschile plurale", 12),
    n("pater, patris", "nome · 3ª decl.", "il padre", "patribus", "ablativo", "plurale", "maschile", "ablativo maschile plurale", 10),
  ],

  /* ---------- hostes — nominativo plurale (il nemico) ---------- */
  hostes: [
    n("hostis, hostis", "nome · 3ª decl.", "il nemico", "hostes", "nominativo", "plurale", "maschile", "nominativo maschile plurale", 12),
    n("hostis, hostis", "nome · 3ª decl.", "il nemico", "hostes", "accusativo", "plurale", "maschile", "accusativo maschile plurale", 10),
  ],
  hostem: [
    n("hostis, hostis", "nome · 3ª decl.", "il nemico", "hostem", "accusativo", "singolare", "maschile", "accusativo maschile singolare", 12),
  ],
  hostium: [
    n("hostis, hostis", "nome · 3ª decl.", "il nemico", "hostium", "genitivo", "plurale", "maschile", "genitivo maschile plurale", 12),
  ],

  /* ---------- amici — nominativo plurale (gli amici) ---------- */
  amici: [
    n("amicus, amici", "nome · 2ª decl.", "l'amico", "amici", "nominativo", "plurale", "maschile", "nominativo maschile plurale", 12),
    n("amicus, amici", "nome · 2ª decl.", "l'amico", "amici", "genitivo", "singolare", "maschile", "genitivo maschile singolare", 10),
  ],
  militum: [
    n("miles, militis", "nome · 3ª decl.", "soldato", "militum", "genitivo", "plurale", "maschile", "genitivo maschile plurale", 12),
  ],
  militibus: [
    n("miles, militis", "nome · 3ª decl.", "soldato", "militibus", "dativo", "plurale", "maschile", "dativo maschile plurale", 12),
    n("miles, militis", "nome · 3ª decl.", "soldato", "militibus", "ablativo", "plurale", "maschile", "ablativo maschile plurale", 10),
  ],

  /* ---------- Romani — «a Romanis» letto da Whitaker come aggettivo ---------- */
  romanis: [
    n("Romanus, Romani", "nome · 2ª decl.", "il Romano", "romanis", "ablativo", "plurale", "maschile", "ablativo maschile plurale", 12),
    n("Romanus, Romani", "nome · 2ª decl.", "il Romano", "romanis", "dativo", "plurale", "maschile", "dativo maschile plurale", 10),
  ],

  /* ---------- servus — «servi» letto da Whitaker come verbo ---------- */
  servi: [
    n("servus, servi", "nome · 2ª decl.", "schiavo, servo", "servi", "nominativo", "plurale", "maschile", "nominativo maschile plurale", 12),
    n("servus, servi", "nome · 2ª decl.", "schiavo, servo", "servi", "genitivo", "singolare", "maschile", "genitivo maschile singolare", 10),
  ],

  /* ---------- rex / dux — «reges» e «duces» letti da Whitaker come verbi ---------- */
  reges: [
    n("rex, regis", "nome · 3ª decl.", "re", "reges", "nominativo", "plurale", "maschile", "nominativo maschile plurale", 12),
    n("rex, regis", "nome · 3ª decl.", "re", "reges", "accusativo", "plurale", "maschile", "accusativo maschile plurale", 10),
  ],
  rege: [
    n("rex, regis", "nome · 3ª decl.", "re", "rege", "ablativo", "singolare", "maschile", "ablativo maschile singolare", 12),
  ],
  duces: [
    n("dux, ducis", "nome · 3ª decl.", "condottiero, capo", "duces", "nominativo", "plurale", "maschile", "nominativo maschile plurale", 12),
    n("dux, ducis", "nome · 3ª decl.", "condottiero, capo", "duces", "accusativo", "plurale", "maschile", "accusativo maschile plurale", 10),
  ],
  duce: [
    n("dux, ducis", "nome · 3ª decl.", "condottiero, capo", "duce", "ablativo", "singolare", "maschile", "ablativo maschile singolare", 12),
  ],

  /* ---------- eques — «equites» letto da Whitaker come verbo ---------- */
  eques: [
    n("eques, equitis", "nome · 3ª decl.", "cavaliere", "eques", "nominativo", "singolare", "maschile", "nominativo maschile singolare", 12),
  ],
  equitem: [
    n("eques, equitis", "nome · 3ª decl.", "cavaliere", "equitem", "accusativo", "singolare", "maschile", "accusativo maschile singolare", 12),
  ],
  equitis: [
    n("eques, equitis", "nome · 3ª decl.", "cavaliere", "equitis", "genitivo", "singolare", "maschile", "genitivo maschile singolare", 12),
  ],
  equite: [
    n("eques, equitis", "nome · 3ª decl.", "cavaliere", "equite", "ablativo", "singolare", "maschile", "ablativo maschile singolare", 12),
  ],
  equites: [
    n("eques, equitis", "nome · 3ª decl.", "cavaliere", "equites", "nominativo", "plurale", "maschile", "nominativo maschile plurale", 12),
    n("eques, equitis", "nome · 3ª decl.", "cavaliere", "equites", "accusativo", "plurale", "maschile", "accusativo maschile plurale", 10),
  ],
  equitum: [
    n("eques, equitis", "nome · 3ª decl.", "cavaliere", "equitum", "genitivo", "plurale", "maschile", "genitivo maschile plurale", 12),
  ],
  equitibus: [
    n("eques, equitis", "nome · 3ª decl.", "cavaliere", "equitibus", "ablativo", "plurale", "maschile", "ablativo maschile plurale", 12),
    n("eques, equitis", "nome · 3ª decl.", "cavaliere", "equitibus", "dativo", "plurale", "maschile", "dativo maschile plurale", 10),
  ],

  /* ---------- lux / libertas — casi errati da Whitaker ---------- */
  luce: [
    n("lux, lucis", "nome · 3ª decl.", "luce", "luce", "ablativo", "singolare", "femminile", "ablativo femminile singolare", 12),
  ],
  luces: [
    n("lux, lucis", "nome · 3ª decl.", "luce", "luces", "nominativo", "plurale", "femminile", "nominativo femminile plurale", 12),
    n("lux, lucis", "nome · 3ª decl.", "luce", "luces", "accusativo", "plurale", "femminile", "accusativo femminile plurale", 10),
  ],
  libertate: [
    n("libertas, libertatis", "nome · 3ª decl.", "libertà", "libertate", "ablativo", "singolare", "femminile", "ablativo femminile singolare", 12),
  ],

  /* ---------- campus — «campos» letto da Whitaker come nominativo ---------- */
  campi: [
    n("campus, campi", "nome · 2ª decl.", "campo, pianura", "campi", "nominativo", "plurale", "maschile", "nominativo maschile plurale", 12),
    n("campus, campi", "nome · 2ª decl.", "campo, pianura", "campi", "genitivo", "singolare", "maschile", "genitivo maschile singolare", 10),
  ],
  campos: [
    n("campus, campi", "nome · 2ª decl.", "campo, pianura", "campos", "accusativo", "plurale", "maschile", "accusativo maschile plurale", 12),
  ],

  /* ---------- hiberna — sostantivo «quartieri invernali» ---------- */
  hiberna: [
    n("hiberna, hibernorum", "nome · 2ª decl.", "quartieri invernali", "hiberna", "accusativo", "plurale", "neutro", "accusativo neutro plurale", 12),
    n("hiberna, hibernorum", "nome · 2ª decl.", "quartieri invernali", "hiberna", "nominativo", "plurale", "neutro", "nominativo neutro plurale", 11),
  ],

  /* ---------- cum / contra — lettura preposizionale prevalente ---------- */
  cum: [
    { lemma: "cum", summary: "preposizione", translation: "con", form: "cum", pos: "preposizione", freq: 12, desc: "preposizione", raw: "PREP" },
    { lemma: "cum", summary: "congiunzione", translation: "quando, poiché", form: "cum", pos: "congiunzione", freq: 10, desc: "congiunzione", raw: "CONJ" },
    { lemma: "cum", summary: "avverbio", translation: "insieme", form: "cum", pos: "avverbio", freq: 6, desc: "avverbio", raw: "ADV" },
  ],
  contra: [
    { lemma: "contra", summary: "preposizione", translation: "contro", form: "contra", pos: "preposizione", freq: 12, desc: "preposizione", raw: "PREP" },
    { lemma: "contra", summary: "avverbio", translation: "di fronte, al contrario", form: "contra", pos: "avverbio", freq: 8, desc: "avverbio", raw: "ADV" },
  ],

  /* ---------- Nomi propri di città (De Bello Gallico) — MANCANTI ---------- */
  oricum: [
    n("Oricum, Orici", "nome proprio · 2ª decl.", "Orico (città dell'Epiro)", "oricum", "nominativo", "singolare", "neutro", "nominativo neutro singolare", 3),
  ],
  vesontio: [
    n("Vesontio, Vesontionis", "nome proprio · 3ª decl.", "Vesontio (città dei Sequani)", "vesontio", "nominativo", "singolare", "femminile", "nominativo femminile singolare", 3),
  ],
  vesontionem: [
    n("Vesontio, Vesontionis", "nome proprio · 3ª decl.", "Vesontio (città dei Sequani)", "vesontionem", "accusativo", "singolare", "femminile", "accusativo femminile singolare", 3),
  ],

  /* ---------- vult — 0 letture in Whitaker (volo, presente 3ª sing.) ---------- */
  vult: [
    v("volo, velle, volui, -", "verbo · irregolare", "volere", "vult", "indicativo", "presente", "attivo", 3, "singolare", "indicativo presente, 3ª singolare", 12),
  ],

  /* ---------- transierunt — 0 letture in Whitaker (transeo, perfetto 3ª pl.) ---------- */
  transierunt: [
    v("transeo, transire, transii, transitum", "verbo · 4ª coniug.", "attraversare, passare oltre", "transierunt", "indicativo", "perfetto", "attivo", 3, "plurale", "indicativo perfetto, 3ª plurale", 12),
  ],
  transiit: [
    v("transeo, transire, transii, transitum", "verbo · 4ª coniug.", "attraversare, passare oltre", "transiit", "indicativo", "perfetto", "attivo", 3, "singolare", "indicativo perfetto, 3ª singolare", 12),
  ],

  /* ---------- copiae / copiis — «le truppe» (non «abbondanza») ---------- */
  copiae: [
    n("copiae, copiarum", "nome · 1ª decl. (pl.)", "le truppe", "copiae", "nominativo", "plurale", "femminile", "nominativo femminile plurale", 12),
  ],
  copiis: [
    n("copiae, copiarum", "nome · 1ª decl. (pl.)", "le truppe", "copiis", "ablativo", "plurale", "femminile", "ablativo femminile plurale", 12),
    n("copiae, copiarum", "nome · 1ª decl. (pl.)", "le truppe", "copiis", "dativo", "plurale", "femminile", "dativo femminile plurale", 10),
  ],
  copias: [
    n("copiae, copiarum", "nome · 1ª decl. (pl.)", "le truppe", "copias", "accusativo", "plurale", "femminile", "accusativo femminile plurale", 12),
  ],

  /* ---------- profectus — participio di proficiscor (non proficio) ---------- */
  profectus: [
    vpar("proficiscor, proficisci, profectus sum", "forma verbale", "partire, mettersi in viaggio", "profectus", "nominativo", "singolare", "maschile", "participio perfetto (di deponente) — nominativo maschile singolare", 12),
  ],
  profecta: [
    vpar("proficiscor, proficisci, profectus sum", "forma verbale", "partire, mettersi in viaggio", "profecta", "nominativo", "singolare", "femminile", "participio perfetto (di deponente) — nominativo femminile singolare", 12),
  ],
  profecti: [
    vpar("proficiscor, proficisci, profectus sum", "forma verbale", "partire, mettersi in viaggio", "profecti", "nominativo", "plurale", "maschile", "participio perfetto (di deponente) — nominativo maschile plurale", 12),
  ],
  profectae: [
    vpar("proficiscor, proficisci, profectus sum", "forma verbale", "partire, mettersi in viaggio", "profectae", "nominativo", "plurale", "femminile", "participio perfetto (di deponente) — nominativo femminile plurale", 12),
  ],

  /* ---------- missus / capta — participi perfetti passivi (lettura garantita) ---------- */
  missus: [
    vpar("mitto, mittere, misi, missus", "forma verbale", "mandare, inviare", "missus", "nominativo", "singolare", "maschile", "participio perfetto passivo (nominativo maschile singolare)", 12),
  ],
  missum: [
    vpar("mitto, mittere, misi, missus", "forma verbale", "mandare, inviare", "missum", "nominativo", "singolare", "neutro", "participio perfetto passivo (nominativo neutro singolare)", 12),
  ],
  missi: [
    vpar("mitto, mittere, misi, missus", "forma verbale", "mandare, inviare", "missi", "nominativo", "plurale", "maschile", "participio perfetto passivo (nominativo maschile plurale)", 12),
    vpar("mitto, mittere, misi, missus", "forma verbale", "mandare, inviare", "missi", "genitivo", "singolare", "maschile", "participio perfetto passivo (genitivo maschile singolare)", 10),
  ],
  missa: [
    vpar("mitto, mittere, misi, missus", "forma verbale", "mandare, inviare", "missa", "nominativo", "singolare", "femminile", "participio perfetto passivo (nominativo femminile singolare)", 12),
    vpar("mitto, mittere, misi, missus", "forma verbale", "mandare, inviare", "missa", "ablativo", "singolare", "femminile", "participio perfetto passivo (ablativo femminile singolare)", 11),
  ],
  capta: [
    vpar("capio, capere, cepi, captus", "forma verbale", "prendere, conquistare", "capta", "ablativo", "singolare", "femminile", "participio perfetto passivo (ablativo femminile singolare)", 12),
    vpar("capio, capere, cepi, captus", "forma verbale", "prendere, conquistare", "capta", "nominativo", "singolare", "femminile", "participio perfetto passivo (nominativo femminile singolare)", 11),
  ],
  captus: [
    vpar("capio, capere, cepi, captus", "forma verbale", "prendere, conquistare", "captus", "nominativo", "singolare", "maschile", "participio perfetto passivo (nominativo maschile singolare)", 12),
  ],
  captum: [
    vpar("capio, capere, cepi, captus", "forma verbale", "prendere, conquistare", "captum", "nominativo", "singolare", "neutro", "participio perfetto passivo (nominativo neutro singolare)", 12),
  ],

  /* ---------- laetati — participio di laetor (deponente, 0 glossario) ---------- */
  laetati: [
    vpar("laetor, laetari, laetatus sum", "forma verbale", "rallegrarsi, gioire", "laetati", "nominativo", "plurale", "maschile", "participio perfetto (di deponente) — nominativo maschile plurale", 12),
  ],
  laetatus: [
    vpar("laetor, laetari, laetatus sum", "forma verbale", "rallegrarsi, gioire", "laetatus", "nominativo", "singolare", "maschile", "participio perfetto (di deponente) — nominativo maschile singolare", 12),
  ],

  /* ---------- vis (la forza) — Whitaker legge «viso» (vedere) ---------- */
  vis: [
    n("vis, vis", "nome · 3ª decl. (irreg.)", "la forza", "vis", "nominativo", "singolare", "femminile", "nominativo femminile singolare", 12),
    n("vis, vis", "nome · 3ª decl. (irreg.)", "la forza", "vis", "accusativo", "singolare", "femminile", "accusativo femminile singolare", 9),
  ],
  vim: [
    n("vis, vis", "nome · 3ª decl. (irreg.)", "la forza", "vim", "accusativo", "singolare", "femminile", "accusativo femminile singolare", 12),
  ],
  vi: [
    n("vis, vis", "nome · 3ª decl. (irreg.)", "la forza", "vi", "ablativo", "singolare", "femminile", "ablativo femminile singolare", 12),
  ],
  vires: [
    n("vis, vis", "nome · 3ª decl. (irreg.)", "la forza", "vires", "nominativo", "plurale", "femminile", "nominativo femminile plurale", 12),
    n("vis, vis", "nome · 3ª decl. (irreg.)", "la forza", "vires", "accusativo", "plurale", "femminile", "accusativo femminile plurale", 10),
  ],
  virium: [
    n("vis, vis", "nome · 3ª decl. (irreg.)", "la forza", "virium", "genitivo", "plurale", "femminile", "genitivo femminile plurale", 12),
  ],
  viribus: [
    n("vis, vis", "nome · 3ª decl. (irreg.)", "la forza", "viribus", "ablativo", "plurale", "femminile", "ablativo femminile plurale", 12),
    n("vis, vis", "nome · 3ª decl. (irreg.)", "la forza", "viribus", "dativo", "plurale", "femminile", "dativo femminile plurale", 10),
  ],

  /* ---------- suus/sua/suum — Whitaker legge «suum» come nome ---------- */
  suus: [
    adj("suus, sua, suum", "aggettivo possessivo", "suo, proprio", "suus", "nominativo", "singolare", "maschile", "aggettivo possessivo (nominativo maschile singolare)", 12),
  ],
  sua: [
    adj("suus, sua, suum", "aggettivo possessivo", "suo, propria", "sua", "nominativo", "singolare", "femminile", "aggettivo possessivo (nominativo femminile singolare)", 12),
    adj("suus, sua, suum", "aggettivo possessivo", "suo, proprio", "sua", "ablativo", "singolare", "femminile", "aggettivo possessivo (ablativo femminile singolare)", 11),
  ],
  suum: [
    adj("suus, sua, suum", "aggettivo possessivo", "suo, proprio", "suum", "nominativo", "singolare", "neutro", "aggettivo possessivo (nominativo neutro singolare)", 12),
    adj("suus, sua, suum", "aggettivo possessivo", "suo, proprio", "suum", "accusativo", "singolare", "neutro", "aggettivo possessivo (accusativo neutro singolare)", 11),
  ],
  sui: [
    adj("suus, sua, suum", "aggettivo possessivo", "suo, proprio", "sui", "nominativo", "plurale", "maschile", "aggettivo possessivo (nominativo maschile plurale)", 12),
    adj("suus, sua, suum", "aggettivo possessivo", "suo, proprio", "sui", "genitivo", "singolare", "maschile", "aggettivo possessivo (genitivo maschile singolare)", 10),
  ],
  suae: [
    adj("suus, sua, suum", "aggettivo possessivo", "suo, propria", "suae", "nominativo", "plurale", "femminile", "aggettivo possessivo (nominativo femminile plurale)", 12),
  ],
  suas: [
    adj("suus, sua, suum", "aggettivo possessivo", "suo, propria", "suas", "accusativo", "plurale", "femminile", "aggettivo possessivo (accusativo femminile plurale)", 12),
  ],
  suos: [
    adj("suus, sua, suum", "aggettivo possessivo", "suo, proprio", "suos", "accusativo", "plurale", "maschile", "aggettivo possessivo (accusativo maschile plurale)", 12),
  ],
  suis: [
    adj("suus, sua, suum", "aggettivo possessivo", "suo, proprio", "suis", "ablativo", "plurale", "maschile", "aggettivo possessivo (ablativo maschile/neutro plurale)", 12),
    adj("suus, sua, suum", "aggettivo possessivo", "suo, proprio", "suis", "dativo", "plurale", "maschile", "aggettivo possessivo (dativo maschile/neutro plurale)", 10),
  ],
  suo: [
    adj("suus, sua, suum", "aggettivo possessivo", "suo, proprio", "suo", "ablativo", "singolare", "maschile", "aggettivo possessivo (ablativo maschile singolare)", 12),
  ],

  /* ---------- incolas (abitanti) — Whitaker dà solo il verbo incolo ---------- */
  incolas: [
    n("incola, incolae", "nome · 1ª decl.", "abitante", "incolas", "accusativo", "plurale", "maschile", "accusativo plurale di incola, -ae (abitante)", 22),
  ],

  /* ---------- incolis (abitanti) — Whitaker dà solo il verbo incolo ---------- */
  incolis: [
    n("incola, incolae", "nome · 1ª decl.", "abitante", "incolis", "dativo", "plurale", "maschile", "dativo plurale di incola, -ae (abitante)", 22),
    n("incola, incolae", "nome · 1ª decl.", "abitante", "incolis", "ablativo", "plurale", "maschile", "ablativo plurale di incola, -ae (abitante)", 21),
  ],

  /* ---------- oratorum (degli oratori) — Whitaker dà solo il participio di oro ---------- */
  oratorum: [
    n("orator, oratoris", "nome · 3ª decl.", "oratore", "oratorum", "genitivo", "plurale", "maschile", "genitivo plurale di orator, oratoris (oratore)", 20),
  ],

  /* ---------- terentia — Whitaker dà solo il participio di tero (terens) ---------- */
  terentia: [
    n("Terentia, Terentiae", "nome proprio · 1ª decl.", "Terentia", "terentia", "nominativo", "singolare", "femminile", "nominativo femminile singolare di Terentia (nome proprio)", 22),
  ],

  /* ---------- convivis — Whitaker dà solo il verbo convivo (2ª sing.) ---------- */
  convivis: [
    n("conviva, convivae", "nome · 1ª decl.", "convitato, ospite", "convivis", "dativo", "plurale", "maschile", "dativo plurale di conviva, -ae (convitato, ospite)", 22),
    n("conviva, convivae", "nome · 1ª decl.", "convitato, ospite", "convivis", "ablativo", "plurale", "maschile", "ablativo plurale di conviva, -ae (convitato, ospite)", 21),
  ],
};
