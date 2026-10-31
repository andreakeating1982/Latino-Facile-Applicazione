/**
 * Motore di analisi del latino per «Latino Facile · Colora le frasi».
 * Pipeline per parola: Whitaker (offline, primario) → cache DB → API Collatinus.
 */

import { eq } from "drizzle-orm";
import * as schema from "../../drizzle/schema";
import { db } from "../db";
import {
  CASE_COLORS,
  MOOD_COLORS,
  POS_COLORS,
  type AnalysisOption,
  type AnalyzeResponse,
  type PosCategory,
  type SentenceGroup,
  type TokenAnalysis,
  type TokenData,
} from "../../shared/types";
import { fetchCollatinus } from "./collatinus";
import { rawToOptions } from "./mapper";
import { normalizeLatinText, normalizeWord } from "./normalize";
import { augmentDualReadings, parseWhitaker } from "./whitaker";
import { OVERRIDES } from "./data/overrides";

/* ---------------------------------------------------------------------
   Colori
   --------------------------------------------------------------------- */
export function optionColor(o: AnalysisOption): string {
  if (o.pos === "verbo") return o.mood ? MOOD_COLORS[o.mood] : MOOD_COLORS.indicativo;
  if (o.pos === "nome" || o.pos === "aggettivo" || o.pos === "pronome" || o.pos === "numerale") {
    return o.case ? CASE_COLORS[o.case] : POS_COLORS.sconosciuto!;
  }
  return POS_COLORS[o.pos] ?? POS_COLORS.sconosciuto!;
}

/* ---------------------------------------------------------------------
   Parole-funzione: preferisci sempre la lettura funzionale
   --------------------------------------------------------------------- */
const FUNCTION_WORDS = new Set(
  "et atque ac aut vel sed nam enim ergo igitur itaque autem vero neque nec si nisi quod quia ut cum dum ubi quando quamquam etsi tametsi quasi sicut velut utinam an num nonne o heu eheu ah vae ecce hercule hem io ohe at atqui ceterum praeterea denique deinde postea tum tunc in ad ab a e ex de sine pro prae sub super subter per contra apud ante post praeter propter ob circum circa supra infra intra extra ultra citra trans erga iuxta penes tenus versus usque clam palam coram absque secus pone non haud iam nunc heri hodie cras semper saepe numquam tamen quoque etiam modo quo qua quam tam ita sic".split(" ")
);

interface PickCtx {
  capitalized: boolean;
  firstInSentence: boolean;
  afterPreposition: boolean;
}

/** Estrae il primo token del lemma (es. «suus, sua, suum» → «suus»). */
function lemmaKey(lemma: string | undefined): string {
  return (lemma ?? "").split(",")[0]?.trim().toLowerCase() ?? "";
}

export function pickDefault(
  options: AnalysisOption[],
  word: string,
  ctx: PickCtx = { capitalized: false, firstInSentence: false, afterPreposition: false }
): number {
  if (options.length === 0) return -1;
  let pool = options.filter((o) => o.pos !== "sconosciuto");
  if (pool.length === 0) pool = options;
  if (FUNCTION_WORDS.has(normalizeWord(word))) {
    const func = pool.filter((o) =>
      ["preposizione", "congiunzione", "avverbio", "interiezione", "particella"].includes(o.pos)
    );
    if (func.length > 0) pool = func;
  }
  // participio > imperativo: se l'opzione predefinita è un raro imperativo
  // ma esiste una lettura participiale, preferisci il participio
  // (es. «capta» = imperativo di capto ma participio di capio)
  if (pool[0]?.pos === "verbo" && pool[0]?.mood === "imperativo") {
    const part = pool.find((o) => o.pos === "verbo" && o.mood === "participio");
    if (part) pool = [part];
  }
  // dopo una preposizione: ablativo, altrimenti accusativo (lettura più comune).
  // Sono inclusi i participi (verbo con caso): es. «a Romanis condita est» →
  // «condita» resta un participio (verde) e non diventa un aggettivo.
  if (ctx.afterPreposition) {
    const isNominalLike = (o: AnalysisOption) =>
      ["nome", "aggettivo", "pronome", "numerale"].includes(o.pos) ||
      (o.pos === "verbo" && o.mood === "participio" && o.case != null);
    const abl = pool.find((o) => isNominalLike(o) && o.case === "ablativo");
    if (abl) {
      // se l'ablativo è un aggettivo possessivo («cum suis copiis») resta lui:
      // la lettura «nome all'accusativo» sarebbe il falso nome «suum»
      if (abl.pos === "aggettivo" && lemmaKey(abl.lemma) !== "suus") {
        const nounAcc = pool.find((o) => o.pos === "nome" && o.case === "accusativo");
        pool = nounAcc ? [nounAcc] : [abl];
      } else {
        pool = [abl];
      }
    } else {
      // senza ablativo: se c'è un participio (es. «in urbem missus») preferiscilo
      // al falso nome all'accusativo generato da Whitaker
      const part = pool.find((o) => o.pos === "verbo" && o.mood === "participio");
      if (part) {
        pool = [part];
      } else {
        const acc = pool.find((o) => isNominalLike(o) && o.case === "accusativo");
        if (acc) pool = [acc];
      }
    }
  }
  // perfetto indicativo in -i (vici, vidi, veni, alui, amavi…): va valutato
  // PRIMA della regola del nominativo, altrimenti «Vici!» o «Alui!» a inizio
  // frase verrebbero letti come nomi (vicis, alvus) invece che come verbi.
  const norm = normalizeWord(word);
  if (norm.length >= 3 && norm.endsWith("i") && !ctx.afterPreposition) {
    const perf = pool.find(
      (o) => o.pos === "verbo" && o.mood === "indicativo" && o.tense === "perfetto" && o.person === 1
    );
    // applica la lettura di perfetto solo se non esiste un nome forte in
    // nominativo (freq ≥ 10): evita di trasformare «servi» (i servi) in un
    // raro verbo, mantenendo «vici», «veni», «amavi», «alui»…
    if (perf) {
      const strongNom = pool.find(
        (o) =>
          ["nome", "aggettivo", "pronome", "numerale"].includes(o.pos) &&
          o.case === "nominativo" &&
          (o.freq ?? 0) >= 10
      );
      if (!strongNom || (perf.freq ?? 0) >= (pool[0]?.freq ?? 0)) pool = [perf];
    }
  }
  // parola iniziale maiuscola: preferisci il nominativo (soggetto) se disponibile
  if (ctx.capitalized && ctx.firstInSentence && !ctx.afterPreposition) {
    const nom = pool.find(
      (o) => ["nome", "aggettivo", "pronome", "numerale"].includes(o.pos) && o.case === "nominativo"
    );
    if (nom) pool = [nom];
  }
  // verbo in -re (3+ sillabe): preferisci l'infinito se presente
  if (norm.length >= 5 && norm.endsWith("re")) {
    const inf = pool.find((o) => o.pos === "verbo" && o.mood === "infinito");
    if (inf) pool = [inf];
  }
  // verbo in -o a inizio frase (cogito, laudo, narro…): indicativo presente 1ª singolare
  if (norm.endsWith("o") && ctx.capitalized && ctx.firstInSentence && !ctx.afterPreposition) {
    const pres1 = pool.find(
      (o) => o.pos === "verbo" && o.mood === "indicativo" && o.tense === "presente" && o.person === 1
    );
    if (pres1) pool = [pres1];
  }
  // 3ª declinazione: il dativo singolare è sempre in -i, mai in -e.
  // Whitaker elenca per le forme in -e un falso dativo («patre», «duce»,
  // «consule», «virtute»): se l'opzione selezionata è un dativo ma esiste
  // un ablativo dello stesso lemma, preferisci l'ablativo.
  if (norm.endsWith("e")) {
    const sel = pool[0];
    if (
      sel &&
      ["nome", "aggettivo", "pronome", "numerale"].includes(sel.pos) &&
      sel.case === "dativo"
    ) {
      const abl = pool.find(
        (o) =>
          ["nome", "aggettivo", "pronome", "numerale"].includes(o.pos) &&
          o.case === "ablativo" &&
          lemmaKey(o.lemma) === lemmaKey(sel.lemma)
      );
      if (abl) pool = [abl];
    }
  }
  // già ordinate per frequenza: prendi la prima
  return options.indexOf(pool[0]);
}

/* ---------------------------------------------------------------------
   Cache in memoria + DB (solo per i risultati Collatinus)
   --------------------------------------------------------------------- */
const memCache = new Map<string, AnalysisOption[]>();

async function cacheGet(word: string): Promise<AnalysisOption[] | null> {
  const hit = memCache.get(word);
  if (hit) return hit;
  if (!db) return null;
  try {
    const [row] = await db
      .select()
      .from(schema.analysisCache)
      .where(eq(schema.analysisCache.word, word))
      .limit(1);
    if (row) {
      const opts = JSON.parse(row.result) as AnalysisOption[];
      memCache.set(word, opts);
      return opts;
    }
  } catch {
    /* cache non disponibile */
  }
  return null;
}

async function cacheSet(word: string, opts: AnalysisOption[]) {
  memCache.set(word, opts);
  if (!db) return;
  try {
    await db
      .insert(schema.analysisCache)
      .values({ word, result: JSON.stringify(opts) })
      .onConflictDoUpdate({
        target: schema.analysisCache.word,
        set: { result: JSON.stringify(opts) },
      });
  } catch {
    /* ignora errori di cache */
  }
}

/* ---------------------------------------------------------------------
   Analisi di una singola parola
   --------------------------------------------------------------------- */
async function analyzeWord(
  word: string,
  ctx: PickCtx = { capitalized: false, firstInSentence: false, afterPreposition: false }
): Promise<TokenAnalysis> {
  const norm = normalizeWord(word);
  let options: AnalysisOption[] | null = null;
  let source: TokenAnalysis["source"] = "whitaker";

  // 1) Whitaker: offline, immediato, 39.000 voci
  const ww = parseWhitaker(word);
  if (OVERRIDES[norm]) {
    // 1b) Dizionario curato: corregge lacune/ordinamenti noti di Whitaker
    options = [...OVERRIDES[norm]];
    const seen = new Set(options.map((o) => `${o.lemma}|${o.pos}|${o.case ?? ""}|${o.mood ?? ""}|${o.number ?? ""}|${o.desc}`));
    for (const o of ww) {
      const k = `${o.lemma}|${o.pos}|${o.case ?? ""}|${o.mood ?? ""}|${o.number ?? ""}|${o.desc}`;
      if (!seen.has(k)) {
        options.push(o);
        seen.add(k);
      }
    }
  } else if (ww.length > 0) {
    options = ww;
  } else {
    // 2) cache DB (risultati Collatinus già recuperati)
    options = await cacheGet(norm);
    if (options) source = "collatinus";
    else {
      // 3) Collatinus live (fallback: nomi rari, medievale, refusi)
      try {
        const raw = await fetchCollatinus(word);
        if (raw && raw.lemmas.length > 0) {
          options = rawToOptions(raw);
          source = "collatinus";
          await cacheSet(norm, options);
        }
      } catch {
        options = null;
      }
    }
  }

  if (!options || options.length === 0) {
    options = [
      {
        lemma: norm,
        summary: "",
        translation: "",
        form: norm,
        pos: "sconosciuto",
        freq: 0,
        desc: "parola non riconosciuta",
        raw: "",
      },
    ];
    source = "manuale";
  }

  // letture doppie (nominativo plurale per -i/-ae/-es ambigue): vale per
  // Whitaker, Collatinus e override
  options = augmentDualReadings(options);

  const selected = pickDefault(options, norm, ctx);
  const sel = options[selected >= 0 ? selected : 0];
  return {
    word: norm,
    display: word.charAt(0).toUpperCase() + word.slice(1),
    options,
    selected: selected >= 0 ? selected : 0,
    category: sel.pos,
    color: optionColor(sel),
    voice: sel.voice,
    number: sel.number,
    label: sel.desc,
    source,
  };
}

/* ---------------------------------------------------------------------
   Tokenizzazione
   --------------------------------------------------------------------- */
const LETTERS = /[A-Za-zāēīōūăĕĭŏŭĀĒĪŌŪĂĔĬŎŬ'’]/;

export function splitToken(raw: string): { word: string; trailing: string; isPunct: boolean } {
  const m = raw.match(/^([A-Za-zāēīōūăĕĭŏŭĀĒĪŌŪĂĔĬŎŬ'’]+)(.*)$/s);
  if (!m) return { word: "", trailing: raw, isPunct: true };
  return { word: m[1], trailing: m[2], isPunct: false };
}

/** Segni di elenco numerato (esercizi «1. … 2. …», «(1)», «IV.»): NON sono
 *  frasi. I numeri romani usano solo I/V/X perché C./M./L./D. all'inizio
 *  di una frase sono quasi sempre prenomi abbreviati (M. Tullius) e il
 *  comando «I.» («va'!») resterebbe comunque un caso da manuale rarissimo. */
const ENUM_SOLO = /^(?:\d{1,3}\s*[.)\-–—:]+|\(\d{1,3}\)|[IVX]{1,5}\s*[.)])$/i;
const ENUM_INIZIO = /^(?:\d{1,3}\s*[.)\-–—:]+\s*|\(\d{1,3}\)\s*|[IVX]{1,5}\s*[.)]\s+)/i;
/** Abbreviazioni di prenome da sole («M.», «C.», «Cn.»…): NON sono frasi,
 *  vanno riunite al blocco che segue. I/V/X esclusi: sono numeri romani
 *  di elenco (già tolti da ENUM_SOLO/ENUM_INIZIO) e «I.» da solo potrebbe
 *  essere il verbo («va'!»). La riunione non cancella mai testo. */
const ABBR_SOLO = /^(?:(?![IVX]\.)[A-Za-zÀ-Þà-þ]\.|Cn\.|Ti\.|Sex\.|Sp\.|Ser\.|Ap\.|Mam\.|Post\.|St\.Tib\.)$/;

export function tokenizeText(text: string): string[][] {
  const sentences: string[][] = [];
  // La frase si spezza SOLO dove finisce davvero: punteggiatura .!?;: seguita
  // da spazio (anche a capo) oppure riga vuota di paragrafo. I ritorni a capo
  // SINGOLI (testo incollato da PDF/foto con l'a capo della pagina) NON spezzano
  // la frase: altrimenti «...atque industriam\nlaudamus.» diventava due blocchi
  // con due finestre di traduzione, spezzando la frase a metà.
  // I numeri di elenco (1. 2. (3) IV.) NON diventano frasi a parte: vengono
  // tolti, altrimenti «2.» compariva come blocco con la sua finestra.
  const chunks = text
    .split(/(?<=[.!?;:])\s+|\n\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  // «M.» / «C.» da soli si riuniscono al blocco dopo («M. Tullius…» resta
  // una frase intera invece di due blocchi con due finestre di traduzione)
  const merged: string[] = [];
  for (let i = 0; i < chunks.length; i++) {
    let chunk = chunks[i];
    if (ABBR_SOLO.test(chunk) && i + 1 < chunks.length) {
      chunk = `${chunk} ${chunks[i + 1]}`;
      i++;
    }
    merged.push(chunk);
  }
  for (const chunk of merged) {
    const senzaElenco = chunk.replace(ENUM_INIZIO, "").trim();
    if (!senzaElenco || ENUM_SOLO.test(senzaElenco)) continue;
    const tokens = senzaElenco.split(/\s+/).filter(Boolean);
    if (tokens.length) sentences.push(tokens);
  }
  return sentences;
}

/* ---------------------------------------------------------------------
   Disambiguazione contestuale (seconda passata a livello di frase)
   --------------------------------------------------------------------- */

/** Preposizioni che reggono l'ablativo */
const PREP_ABL = new Set([
  "a", "ab", "abs", "cum", "de", "e", "ex", "sine", "pro", "prae",
  "coram", "palam", "clam", "absque", "tenus",
]);

/** Preposizioni che reggono l'accusativo */
const PREP_ACC = new Set([
  "ad", "apud", "ante", "adversus", "adversum", "circa", "circum", "cis",
  "citra", "contra", "erga", "extra", "infra", "inter", "intra", "iuxta",
  "ob", "per", "pone", "post", "praeter", "prope", "propter", "secus",
  "supra", "trans", "ultra", "versus", "usque",
]);

/** Preposizioni con doppia reggenza (stato = ablativo, moto = accusativo) */
const PREP_EITHER = new Set(["in", "sub", "super", "subter"]);

function isNominalLike(o: AnalysisOption): boolean {
  return (
    ["nome", "aggettivo", "pronome", "numerale"].includes(o.pos) ||
    (o.pos === "verbo" && o.mood === "participio" && o.case != null)
  );
}

function isFiniteVerb(o: AnalysisOption): boolean {
  return (
    o.pos === "verbo" &&
    o.mood != null &&
    ["indicativo", "congiuntivo", "imperativo"].includes(o.mood)
  );
}

/** Applica l'opzione «idx» al token aggiornando selezione, colore, voce,
 *  numero (apice S/P) ed etichetta. */
function applyOption(t: TokenData, idx: number): void {
  const a = t.analysis!;
  const o = a.options[idx];
  a.selected = idx;
  a.category = o.pos;
  a.color = optionColor(o);
  a.voice = o.voice;
  a.number = o.number;
  a.label = o.desc;
}

/** Prossima parola (salta la punteggiatura) a partire da «from». */
function nextWord(sentence: TokenData[], from: number): TokenData | null {
  for (let i = from; i < sentence.length; i++) {
    if (!sentence[i].isPunct && sentence[i].analysis) return sentence[i];
  }
  return null;
}

function prevWord(sentence: TokenData[], from: number): TokenData | null {
  for (let i = from; i >= 0; i--) {
    if (!sentence[i].isPunct && sentence[i].analysis) return sentence[i];
  }
  return null;
}

/**
 * Regole contestuali applicate DOPO l'analisi parola per parola.
 * Correggono i casi in cui la sola frequenza del dizionario sceglie la
 * funzione sbagliata (es. «cum docto magistro», «impedimenta … vincent»).
 */
function refineSentence(sentence: TokenData[]): void {
  /* ---- 00) Forme in -OS della 2ª declinazione («servos», «dominos»,
            «amicos»…): Collatinus mette al primo posto il «nominativo
            singolare» ARCAICO, che in latino classico NON esiste (il
            nominativo singolare di servus è «servus»): la forma in -os è
            l'ACCUSATIVO PLURALE (richiesta utente 26/10g, caso «Domini
            servos laudant»). Aggiunge l'opzione mancante e la rende il
            default. ---- */
  for (const t of sentence) {
    if (t.isPunct || !t.analysis) continue;
    const w = t.word.toLowerCase();
    if (!w.endsWith("os") || w.length < 4) continue;
    const a = t.analysis;
    if (
      a.options.some(
        (o) =>
          ["nome", "aggettivo", "pronome"].includes(o.pos) &&
          o.case === "accusativo" &&
          o.number === "plurale"
      )
    )
      continue;
    const nomSg = a.options.find(
      (o) =>
        ["nome", "aggettivo", "pronome"].includes(o.pos) &&
        o.case === "nominativo" &&
        o.number === "singolare"
    );
    if (!nomSg) continue;
    // solo lemmi della 2ª declinazione in -us (servus, dominus, amicus…):
    // esclude i monosillabi e la 3ª declinazione (os, mos, flos, dos) e i
    // grecismi (logos, ethos), che hanno davvero il nominativo in -os
    if (!lemmaKey(nomSg.lemma).endsWith("us")) continue;
    const accPl: AnalysisOption = {
      ...nomSg,
      case: "accusativo",
      number: "plurale",
      desc: `accusativo ${nomSg.gender ?? "maschile"} plurale`,
    };
    a.options.push(accPl);
    applyOption(t, a.options.length - 1);
  }

  /* ---- 0) Omografi verbo/nome: preferisci la lettura nominale (oggetto)
            quando nella frase c'è già un altro verbo finito non separato da
            una congiunzione subordinante. «Vigiliarum sollertia incolas a
            piratarum minis servat» → incolas = accusativo plurale di incola
            (gli abitanti), NON «che tu abiti» (incolo 2ª sing. congiuntivo);
            «Servo portas» → portas = porte, non «tu porti». La congiunzione
            protegge le subordinate reali: «si portas, gaudeo» → portas resta
            verbo (se porti, gioisco). ---- */
  const SUBORD_CONJ = new Set([
    "ut", "ne", "cum", "quod", "quia", "dum", "donec", "quoad", "si",
    "nisi", "quamquam", "etsi", "tametsi", "quin", "quo", "quando",
    "ubi", "utinam", "quasi", "sicut", "velut", "postquam", "antequam",
    "priusquam", "quamvis", "licet", "dummodo", "modo",
  ]);
  for (let i = 0; i < sentence.length; i++) {
    const t = sentence[i];
    if (t.isPunct || !t.analysis) continue;
    const sel = t.analysis.options[t.analysis.selected];
    // participio con lettura di NOME nello stesso caso: preferisci il nome
    // («oratorum» = degli oratori, non il participio di oro; «notas» = note)
    if (sel.pos === "verbo" && sel.mood === "participio") {
      const nomSame = t.analysis.options.find(
        (o) => o.pos === "nome" && o.case === sel.case
      );
      if (nomSame) {
        applyOption(t, t.analysis.options.indexOf(nomSame));
        continue;
      }
    }
    if (sel.pos !== "verbo" || !isFiniteVerb(sel)) continue;
    const nom = t.analysis.options.find(
      (o) =>
        ["nome", "aggettivo", "pronome", "numerale"].includes(o.pos) &&
        o.case != null
    );
    if (!nom) continue;
    // c'è un altro verbo finito nella frase? Allora il predicato è quello
    // e questa parola è un nome (oggetto). Una congiunzione subordinante
    // PRIMA della parola indica invece una subordinata reale: «si portas,
    // gaudeo» → portas resta verbo (se porti, gioisco).
    let blocked = false;
    for (let k = 0; k < i; k++) {
      const tk = sentence[k];
      if (tk.isPunct || !tk.analysis) continue;
      const ok = tk.analysis.options[tk.analysis.selected];
      if (ok.pos === "congiunzione" && SUBORD_CONJ.has(lemmaKey(ok.lemma))) {
        blocked = true;
        break;
      }
    }
    let convert = false;
    if (!blocked) {
      for (let k = 0; k < sentence.length; k++) {
        if (k === i) continue;
        const tk = sentence[k];
        if (tk.isPunct || !tk.analysis) continue;
        const ok = tk.analysis.options[tk.analysis.selected];
        if (isFiniteVerb(ok)) {
          convert = true;
          break;
        }
      }
    }
    if (convert) applyOption(t, t.analysis.options.indexOf(nom));
  }

  /* ---- 1) Oggetti delle preposizioni: forza il caso retto ---- */
  for (let i = 0; i < sentence.length; i++) {
    const t = sentence[i];
    if (t.isPunct || !t.analysis) continue;
    const sel = t.analysis.options[t.analysis.selected];
    if (sel.pos !== "preposizione") continue;
    const lemma = lemmaKey(sel.lemma).toLowerCase();
    const want = PREP_ABL.has(lemma)
      ? "ablativo"
      : PREP_ACC.has(lemma)
        ? "accusativo"
        : PREP_EITHER.has(lemma)
          ? "ablativo"
          : null;
    if (!want) continue;
    let forced = 0;
    let prevGender: string | null = null;
    let prevNumber: string | null = null;
    let j = i + 1;
    while (j < sentence.length && forced < 4) {
      const tj = sentence[j];
      if (tj.isPunct || !tj.analysis) {
        j++;
        continue;
      }
      const opts = tj.analysis.options;
      // candidato al caso retto: preferisci aggettivo/nome/pronome al participio
      // (es. «cum docto magistro» → docto = aggettivo ablativo, non participio)
      const cand =
        opts.find(
          (o) =>
            ["nome", "aggettivo", "pronome", "numerale"].includes(o.pos) &&
            o.case === want
        ) ??
        opts.find((o) => o.pos === "verbo" && o.mood === "participio" && o.case === want);
      if (!cand) {
        // prima del nome testa può esserci un genitivo di specificazione
        // («apud Mercurii fanum», «ad Caesaris castra», «de Caesaris morte»):
        // applicalo e continua verso il nome testa. Dopo il nome testa
        // (forced ≥ 1) ci si ferma: un genitivo successivo appartiene ad
        // altro sintagma («apud fanum … multi homines»).
        if (forced === 0) {
          const gen = opts.find(
            (o) =>
              ["nome", "aggettivo", "pronome", "numerale"].includes(o.pos) &&
              o.case === "genitivo"
          );
          if (gen) {
            applyOption(tj, opts.indexOf(gen));
            forced++;
            j++;
            continue;
          }
        }
        break; // parola non nominale o senza il caso retto: fine del complemento
      }
      // Un candidato al caso retto che ha ANCHE la forma genitiva (es. 1ª
      // decl. -ae: «Romae» in «a Romae incolis» = "dagli abitanti di Roma")
      // può essere un attributo davanti al nome testa: se più avanti c'è un
      // altro candidato con il caso retto, applica il genitivo e continua.
      if (forced === 0 && cand) {
        const isGenForm = opts.some(
          (o) =>
            ["nome", "aggettivo", "pronome", "numerale"].includes(o.pos) &&
            o.case === "genitivo"
        );
        if (isGenForm) {
          let later = false;
          for (let k = j + 1; k < sentence.length && !later; k++) {
            const tk = sentence[k];
            if (tk.isPunct || !tk.analysis) continue;
            const ok = tk.analysis.options;
            later =
              ok.some(
                (o) =>
                  ["nome", "aggettivo", "pronome", "numerale"].includes(o.pos) &&
                  o.case === want
              ) ||
              ok.some(
                (o) => o.pos === "verbo" && o.mood === "participio" && o.case === want
              );
          }
          if (later) {
            const gen = opts.find(
              (o) =>
                ["nome", "aggettivo", "pronome", "numerale"].includes(o.pos) &&
                o.case === "genitivo"
            );
            if (gen) {
              applyOption(tj, opts.indexOf(gen));
              // l'attributo non deve imporre concordanza al nome testa
              prevGender = null;
              prevNumber = null;
              forced++;
              j++;
              continue;
            }
          }
        }
      }
      // dalla seconda parola in poi: deve concordare in genere/numero con la
      // precedente (es. «a Romanis condita» → condita NON concorda con
      // Romanis: resta com'è; «a Petronio bono patre» → patre concorda ed è
      // l'apposizione del complemento d'agente)
      if (forced >= 1 && (prevGender != null || prevNumber != null)) {
        const badGender =
          prevGender != null && cand.gender != null && cand.gender !== prevGender;
        const badNumber =
          prevNumber != null && cand.number != null && cand.number !== prevNumber;
        if (badGender || badNumber) break;
      }
      const idx = opts.indexOf(cand);
      applyOption(tj, idx);
      prevGender = cand.gender ?? null;
      prevNumber = cand.number ?? null;
      forced++;
      j++;
    }
  }

  /* ---- 2) Avverbi ambigui («certe», «facile» …) ---- */
  for (let i = 0; i < sentence.length; i++) {
    const t = sentence[i];
    if (t.isPunct || !t.analysis) continue;
    const opts = t.analysis.options;
    const adv = opts.find((o) => o.pos === "avverbio");
    if (!adv) continue;
    const sel = opts[t.analysis.selected];
    const next = nextWord(sentence, i + 1);
    const nextVerb = next?.analysis?.options.find(isFiniteVerb);
    const nextIsCopula =
      nextVerb != null && ["sum", "esse", "fore"].includes(lemmaKey(nextVerb.lemma));
    const switchToAdv =
      sel.case === "vocativo" || // «certe» = vocativo di certus → «certamente»
      (sel.pos === "aggettivo" &&
        (sel.case === "nominativo" || sel.case === "accusativo") &&
        nextVerb != null &&
        !nextIsCopula); // «facile vincent», ma NON «iter facile est»
    if (switchToAdv) applyOption(t, opts.indexOf(adv));
  }

  /* ---- 3) Oggetti diretti (nom/acc ambigui) quando il soggetto è già espresso ---- */
  // verbi intransitivi comuni: mai oggetto diretto (es. «milites victores venerunt»)
  const INTRANSITIVE_COMMON = new Set([
    "venio", "eo", "vado", "maneo", "sto", "sedeo", "iaceo", "curro",
    "ambulo", "deambulo", "incedo", "pergo", "erro", "vivo", "gaudeo",
    "doleo", "morior", "nascor", "dormio", "pugno", "laboro", "nato",
    "volo", "propero", "pervenio", "redeo", "exeo", "abeo", "surgo",
    "cado", "cresco",
  ]);
  // nelle frasi scolastiche il verbo principale è l'ultimo verbo finito
  let lastVerbIdx = -1;
  for (let i = 0; i < sentence.length; i++) {
    const t = sentence[i];
    if (t.isPunct || !t.analysis) continue;
    if (isFiniteVerb(t.analysis.options[t.analysis.selected])) lastVerbIdx = i;
  }
  if (lastVerbIdx >= 0) {
    const vt = sentence[lastVerbIdx];
    const vSel = vt.analysis!.options[vt.analysis!.selected];
    const vLemma = lemmaKey(vSel.lemma);
    const isCopula = ["sum", "esse", "fore"].includes(vLemma);
    const isIntransitive = INTRANSITIVE_COMMON.has(vLemma);
    // passivo vero: il nominativo è il soggetto (paziente), non l'oggetto
    // («multi sermones dicebantur»). I deponenti (lemma con «sum»: sequor,
    // sequi, secutus sum) hanno forma passiva ma senso attivo e continuano
    // a reggere l'accusativo («hostes sequuntur»). Il controllo usa il lemma
    // COMPLETO (lemmaKey troncherebbe a «sequor»).
    const isTruePassive =
      vSel.voice === "passivo" && !(vSel.lemma ?? "").includes(" sum");
    const hasSubjectBefore = sentence
      .slice(0, lastVerbIdx)
      .some(
        (p) =>
          !p.isPunct &&
          p.analysis != null &&
          ["nome", "aggettivo", "pronome", "numerale"].includes(p.analysis.category) &&
          p.analysis.options[p.analysis.selected].case === "nominativo"
      );
    if (!isCopula && !isIntransitive && !isTruePassive && hasSubjectBefore) {
      // il primo nominativo della frase è il soggetto: non si tocca
      let firstNomSeen = false;
      for (let j = 0; j < sentence.length; j++) {
        const tj = sentence[j];
        if (tj.isPunct || !tj.analysis) continue;
        const tsel = tj.analysis.options[tj.analysis.selected];
        if (!["nome", "aggettivo", "pronome", "numerale"].includes(tsel.pos)) continue;
        if (tsel.case !== "nominativo" && tsel.case !== "accusativo") continue;
        // solo nomi e pronomi rivendicano il soggetto: un aggettivo
        // («multi homines») o un numerale che precede il nome non deve
        // impedire al nome di restare soggetto
        if (
          !firstNomSeen &&
          tsel.case === "nominativo" &&
          (tsel.pos === "nome" || tsel.pos === "pronome")
        ) {
          firstNomSeen = true; // soggetto: resta nominativo
          continue;
        }
        // solo i nomi (non aggettivi/pronome): evita di trasformare
        // «milites fortes» (soggetto + attributo) in oggetti
        if (tsel.pos !== "nome") continue;
        const acc = tj.analysis.options.find((o) => o.pos === "nome" && o.case === "accusativo");
        if (acc) applyOption(tj, tj.analysis.options.indexOf(acc));
      }
    }
  }

  /* ---- 4) Dativo/ablativo ambigui: preferisci l'ablativo (strumento, tempo)
            a meno che il verbo principale regga il dativo ---- */
  // verbi che introducono un complemento di termine (dativo): in loro presenza
  // il dativo è la lettura corretta («Pater filio librum dat»); altrimenti le
  // forme -o/-is ambigue sono più spesso ablative («autumno» = tempo,
  // «aratro» = strumento)
  const DATIVE_VERBS = new Set([
    "do", "dono", "tribuo", "praebeo", "mitto", "nuntio", "dico", "narro", "scribo",
    "credo", "parco", "faveo", "placeo", "studeo", "servio", "noceo",
    "respondeo", "persuadeo", "impero", "oboedio", "pareo", "ignosco",
    "irascor", "indulgeo", "invideo", "medeor", "minor", "suadeo",
    "praesto", "supplico", "gratulor", "benedico", "maledico", "officio",
    "adversor", "auxilior", "confido", "diffido", "fido", "obsum",
    "praesum", "prosum", "subvenio", "succurro", "occurro", "accedo",
    "appropinquo", "nubo", "displiceo", "libet", "licet", "videor",
  ]);
  let lastFiniteIdx = -1;
  for (let i = 0; i < sentence.length; i++) {
    const t = sentence[i];
    if (t.isPunct || !t.analysis) continue;
    if (isFiniteVerb(t.analysis.options[t.analysis.selected])) lastFiniteIdx = i;
  }
  if (lastFiniteIdx >= 0) {
    const fv = sentence[lastFiniteIdx].analysis!;
    const fSel = fv.options[fv.selected];
    const fLemma = lemmaKey(fSel.lemma);
    const copula = ["sum", "esse", "fore"].includes(fLemma);
    const takesDative = DATIVE_VERBS.has(fLemma);
    if (!copula && !takesDative) {
      for (const t of sentence) {
        if (t.isPunct || !t.analysis) continue;
        const sel = t.analysis.options[t.analysis.selected];
        if (sel.case !== "dativo") continue;
        if (!["nome", "aggettivo", "pronome", "numerale"].includes(sel.pos)) continue;
        // stessa forma flessa, stessa voce di lemma: solo così il confronto è sicuro
        // (es. «aratro» dativo → «aratro» ablativo, ma non il falso «autumnus» verbo)
        const abl = t.analysis.options.find(
          (o) =>
            ["nome", "aggettivo", "pronome", "numerale"].includes(o.pos) &&
            o.case === "ablativo" &&
            lemmaKey(o.lemma) === lemmaKey(sel.lemma)
        );
        if (abl) applyOption(t, t.analysis.options.indexOf(abl));
      }
    }
  }

  /* ---- 5) Concordanza aggettivo↔nome e genitivo di specificazione ---- */
  // 5a) Genitivo di specificazione PRIMA del nome testa: in «nostrae
  //     paeninsulae orae … infestantur» il soggetto è orae e «nostrae
  //     paeninsulae» è il suo attributo genitivo (le coste DELLA NOSTRA
  //     penisola). Un NOME in nominativo seguito da un altro NOME in
  //     nominativo è quasi sempre un attributo genitivo del secondo
  //     («paeninsulae orae», «Caesaris castra», «poetae fabulae»).
  //     Limiti voluti: non si tocca il primo nominale della frase (il
  //     soggetto a inizio frase resta nominativo: «Nautae insulae
  //     appropinquant» → nautae resta soggetto) e, dopo la regola 3,
  //     l'oggetto diretto è già accusativo («Milites hostes superant»).
  for (let i = 0; i < sentence.length; i++) {
    const t = sentence[i];
    if (t.isPunct || !t.analysis) continue;
    const sel = t.analysis.options[t.analysis.selected];
    if (sel.pos !== "nome" || sel.case !== "nominativo") continue;
    const gen = t.analysis.options.find((o) => o.pos === "nome" && o.case === "genitivo");
    if (!gen) continue;
    // il primo nominale della frase è di norma il soggetto: non toccarlo
    // («Nautae insulae appropinquant» → nautae resta soggetto). Ma se nella
    // frase non c'è alcun verbo finito, la sequenza è un sintagma nominale
    // e il primo nome è quasi sempre un attributo genitivo del secondo
    // («poetae fabulae» = le storie del poeta, «nautae insulae» = le isole
    // dei marinai).
    let firstNom = -1;
    for (let k = 0; k < sentence.length; k++) {
      const tk = sentence[k];
      if (tk.isPunct || !tk.analysis) continue;
      const sk = tk.analysis.options[tk.analysis.selected];
      if (["nome", "aggettivo", "pronome", "numerale"].includes(sk.pos)) {
        firstNom = k;
        break;
      }
    }
    const hasFinite = sentence.some(
      (tk) => tk.analysis && isFiniteVerb(tk.analysis.options[tk.analysis.selected])
    );
    if (firstNom === i && hasFinite) continue;
    const next = nextWord(sentence, i + 1);
    if (!next || next.isPunct || !next.analysis) continue;
    const nsel = next.analysis.options[next.analysis.selected];
    if (nsel.pos !== "nome" || nsel.case !== "nominativo") continue;
    applyOption(t, t.analysis.options.indexOf(gen));
  }

  // 5b) L'aggettivo/pronome/numerali adotta il caso di un nominale adiacente
  //     che concorda in genere e numero («magna voluptate» → magna ablativo,
  //     «multi homines» → multi nominativo, «suis uxoribus» → suis ablativo).
  //     Vale solo per aggettivi/pronomi/numerali: i nomi non cambiano caso
  //     per concordanza («Milites hostes superant» → milites resta nominativo).
  for (let i = 0; i < sentence.length; i++) {
    const t = sentence[i];
    if (t.isPunct || !t.analysis) continue;
    const sel = t.analysis.options[t.analysis.selected];
    if (!["aggettivo", "pronome", "numerale"].includes(sel.pos)) continue;
    const opts = t.analysis.options;
    for (const n of [prevWord(sentence, i - 1), nextWord(sentence, i + 1)]) {
      if (!n || n.isPunct || !n.analysis) continue;
      const nsel = n.analysis.options[n.analysis.selected];
      if (!["nome", "aggettivo", "pronome", "numerale"].includes(nsel.pos)) continue;
      if (nsel.case == null || nsel.gender == null || nsel.number == null) continue;
      const agree = opts.find(
        (o) =>
          ["nome", "aggettivo", "pronome", "numerale"].includes(o.pos) &&
          o.case === nsel.case &&
          o.gender === nsel.gender &&
          o.number === nsel.number
      );
      if (agree) {
        applyOption(t, opts.indexOf(agree));
        break;
      }
    }
  }

  // 5c) Genitivo di specificazione: un NOME che segue un altro nominale in
  //     nominativo/accusativo/ablativo, se ha una lettura genitiva, è quasi
  //     sempre un attributo («liber pueri», «urbs Romae», «fanum Mercurii»).
  //     Non vale per gli aggettivi («multi homines» resta nominativo), né per
  //     i nomi già genitivi, né se il nome concorda col precedente («multi
  //     pueri» → pueri nominativo) né a inizio frase («Nautae vento navigant»
  //     → nautae resta soggetto).
  for (let i = 0; i < sentence.length; i++) {
    const t = sentence[i];
    if (t.isPunct || !t.analysis) continue;
    const sel = t.analysis.options[t.analysis.selected];
    if (sel.pos !== "nome" || sel.case === "genitivo") continue;
    const gen = t.analysis.options.find((o) => o.pos === "nome" && o.case === "genitivo");
    if (!gen) continue;
    const prev = prevWord(sentence, i - 1);
    if (!prev || prev.isPunct || !prev.analysis) continue;
    const psel = prev.analysis.options[prev.analysis.selected];
    if (!["nome", "aggettivo", "pronome", "numerale"].includes(psel.pos)) continue;
    if (!["nominativo", "accusativo", "ablativo"].includes(psel.case ?? "")) continue;
    // se concorda col precedente è parte dello stesso sintagma: niente genitivo
    const agree = t.analysis.options.find(
      (o) =>
        o.case === psel.case &&
        o.gender === psel.gender &&
        o.number === psel.number
    );
    if (agree) continue;
    applyOption(t, t.analysis.options.indexOf(gen));
  }
}

/* ---------------------------------------------------------------------
   Analisi di un intero testo
   --------------------------------------------------------------------- */
export async function analyzeText(text: string): Promise<AnalyzeResponse> {
  // normalizza subito gli accenti (macron/breve), le dieresi e le legature
  // («Rōma» → «Roma», «poëta» → «poeta», «cælum» → «caelum»): l'analisi,
  // la traduzione e la colorazione lavorano su testo ASCII
  const sentenceTokens = tokenizeText(normalizeLatinText(text));
  const unknownWords: string[] = [];
  let apiUsed = false;

  const sentences: SentenceGroup[] = [];
  for (const rawTokens of sentenceTokens) {
    const tokens: TokenData[] = [];
    // frase preposizionale: da una preposizione fino al primo verbo i nominali
    // tendono ad avere ablativo (o accusativo) — es. «De bello Gallico»
    let inPrepPhrase = false;
    let prepNominals = 0;
    for (const raw of rawTokens) {
      const { word, trailing, isPunct } = splitToken(raw);
      if (isPunct || word === "") {
        tokens.push({ text: raw, word: "", trailing: raw, isPunct: true, analysis: null });
        inPrepPhrase = false;
        continue;
      }
      const analysis = await analyzeWord(word, {
        capitalized: /^[A-ZĀĒĪŌŪĂĔĬŎŬ]/.test(word),
        firstInSentence: tokens.length === 0,
        afterPreposition: inPrepPhrase,
      });
      if (analysis.category === "sconosciuto") unknownWords.push(analysis.display);
      if (analysis.source === "collatinus") apiUsed = true;
      tokens.push({ text: raw, word, trailing, isPunct: false, analysis });
      // aggiorna lo stato della frase preposizionale: la preferenza per
      // ablativo/accusativo vale per il complemento (1-2 parole), poi si
      // azzera per non contagiare le parole successive («a Romanis condita»)
      if (analysis.category === "preposizione") {
        inPrepPhrase = true;
        prepNominals = 0;
      } else if (analysis.category === "verbo") {
        inPrepPhrase = false;
      } else if (
        inPrepPhrase &&
        ["nome", "aggettivo", "pronome", "numerale"].includes(analysis.category)
      ) {
        prepNominals += 1;
        if (prepNominals >= 2) inPrepPhrase = false;
      }
    }
    refineSentence(tokens);
    sentences.push({ tokens });
  }

  return { sentences, unknownWords, apiUsed };
}
