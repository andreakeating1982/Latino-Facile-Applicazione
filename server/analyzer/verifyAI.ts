/**
 * Verifica automatica con l'IA (Easy-Peasy) della traduzione e della
 * colorazione delle frasi latine.
 *
 * Si usa nel percorso "automatico" (MyMemory/DeepL/glossario): l'IA riceve le
 * frasi latine con la traduzione automatica corrente e restituisce un JSON con:
 *   1. traduzioni corrette (voce passiva, persona/numero, tempo, genitivi…)
 *   2. per OGNI parola latina il ruolo sintattico (per la colorazione)
 *
 * Le frasi sono processate a CHUNK di 2, con chiamate parallele e output
 * «Long»: con più frasi in un'unica chiamata la risposta superava max_tokens
 * («Medium» = 800 token), il JSON si troncava, il parse falliva e la
 * colorazione restava «regole» pur avendo risposto l'IA. Con i chunk la
 * risposta entra sempre nei limiti e i tempi restano bassi (chiamate in
 * parallelo a ondate).
 *
 * La verifica è best-effort: in caso di errore, timeout o JSON malformato il
 * singolo chunk fallisce e il chiamante mantiene il risultato automatico per
 * le frasi di quel chunk (i chunk riusciti contribuiscono comunque ruoli e
 * traduzioni). I risultati sono memorizzati in cache in memoria PER CHUNK
 * (una classe traduce spesso lo stesso brano): alla richiesta successiva si
 * rifanno solo i chunk falliti.
 */

import { generateText } from "../_core/llm";
import type { SentenceGroup } from "../../shared/types";

const VALID_ROLES = new Set([
  "nominativo",
  "genitivo",
  "dativo",
  "accusativo",
  "vocativo",
  "ablativo",
  "verbo",
  "funzione",
  "participio",
  /* 27/10: ruoli di dettaglio — il MODO del verbo e il TIPO della parola-
     funzione. Prima l'IA diceva solo «verbo»/«funzione» e la scelta restava
     al dizionario: «amare» (infinito) usciva arancione come un indicativo,
     «cum» + nome usciva congiunzione/avverbio, «Marce, veni!» indicativo. */
  "congiuntivo",
  "imperativo",
  "infinito",
  "preposizione",
  "congiunzione",
  "avverbio",
]);

/** Regola di dettaglio condivisa dai due prompt (modo verbale, tipo di
 *  parola-funzione, accusativo con l'infinito). */
const DETAIL_RULES =
  "• DETTAGLIO DEI VERBI: usa «verbo» per l'INDICATIVO (tutti i tempi); «congiuntivo» per il " +
  "congiuntivo (ut/ne/cum + congiuntivo, periodo ipotetico irreale, ecc.); «imperativo» per " +
  "l'imperativo (venite, audi, veni! se è un ordine); «infinito» per OGNI infinito (amare, " +
  "venire, esse, vivere, mori, delere…); «participio» per participi e gerundivi (delenda, " +
  "victi, capta, oriente).\n" +
  "• DETTAGLIO DELLE PAROLE-FUNZIONE: invece di «funzione» scrivi «preposizione» (in, ad, per, " +
  "post, ante, de, sine, pro, a/ab, ex, cum + ABLATIVO = «con»), «congiunzione» (et, sed, " +
  "quia, quod, ut, ne, dum, si, postquam, quamquam, cum + VERBO = «quando/poiché», -que) o " +
  "«avverbio» (non, nunc, saepe, hodie, etiam, cur, quo, ubi, fortiter…). ATTENZIONE: «cum» è " +
  "preposizione se regge un ablativo (cum legionibus), congiunzione se introduce un verbo " +
  "(cum Caesar venisset); «post» e «ante» + accusativo sono preposizioni; «etiam» e «non» sono " +
  "avverbi; «ne» e «quod» sono congiunzioni.\n" +
  "• ACCUSATIVO CON L'INFINITO: dopo verbi come dico, puto, scio, video, audio, spero, nego, " +
  "credo, il SOGGETTO dell'infinito è in «accusativo» anche se la forma sembra un nominativo " +
  "(es. «Scio hostes appropinquare» → hostes = accusativo; «Dico te venire» → te = accusativo).\n";

const VALID_NUMBERS = new Set(["singolare", "plurale"]);

/** Tipi di enclitica segnalabili dall'IA. Il colore PDF viene dalla
 *  categoria della desinenza in legenda; nessun colore nel prompt. */
const VALID_ENCLITICHE = new Set(["congiunzione", "preposizione", "particella"]);

/** Divisione base + enclitica per una parola (es. tutamque → { base:
 *  "accusativo", enclitica: "congiunzione" }). */
export interface EncliticSplit {
  base: string;
  enclitica: string;
}

/** Numeri grammaticali per parola (apice S/P nell'app e nel PDF). */
export interface AINumbersResult {
  numbers: Record<string, string>;
}

export interface AIVerifyResult {
  /** Traduzioni nello stesso ordine delle frasi; null = frase senza traduzione IA */
  lines: (string | null)[];
  roles: Record<string, string>;
  /** Numero grammaticale (singolare/plurale) per parola, per l'apice S/P */
  numbers: Record<string, string>;
  /** Parole formate da base + enclitica (es. tutamque = tutam + que) */
  enclitics: Record<string, EncliticSplit>;
}

/** Risultato di un singolo chunk (tutte le frasi del chunk tradotte). */
interface ChunkVerifyResult {
  /* 26/10u: le singole traduzioni possono mancare (JSON troncato al limite
     dei token con i testi lunghi) — null = frase non coperta da questo chunk */
  lines: (string | null)[];
  roles: Record<string, string>;
  numbers: Record<string, string>;
  enclitics: Record<string, EncliticSplit>;
}

/** Frasi per chiamata IA: con output «Long» il JSON entra sempre nei limiti. */
/* 26/10v: da 2 a 4 frasi per chunk — sui testi lunghi le istruzioni del
   prompt venivano ripetute una volta ogni 2 frasi (8 chiamate per 16
   frasi) bruciando la quota di parole del piano AI a metà lavoro: ora
   sono la metà delle chiamate, con le stesse regole per chiamata. */
/* 26/10x: 1 frase per chiamata, tutte in parallelo (MAX_PARALLEL 8): la latenza è dominata dai token in uscita (~80/s, JSON con i ruoli di ogni parola) → con 2 frasi per chiamata ogni chiamata durava 15-25 s */
const CHUNK_SIZE = 1;
/** Chiamate IA in parallelo per ondata. */
/* 26/10u: da 4 a 8 chunk in parallelo — con i testi lunghi (fino a ~10
   chunk da 2 frasi) 4 alla volta servivano 3 ondate e l'IA non finiva
   nel budget HTTP: 8 alla volta le riduce a 1-2. */
const MAX_PARALLEL = 8;

/* 26/10v: quota AI del piano esaurita (errore 429 «limit of allowed words
   in your plan») — vero a livello modulo. I chunk rimanenti della stessa
   ondata e i retry lato router la controllano e non partono più; viene
   azzerata all'inizio di ogni nuova chiamata di verifyWithAI. */
let aiQuotaHit = false;
export function aiQuotaExhausted(): boolean {
  return aiQuotaHit;
}

const cache = new Map<string, ChunkVerifyResult>();
const rolesCache = new Map<string, AIRolesResult>();

/** Divide n elementi in gruppi di indici di dimensione `size`. */
function chunkIndexes(n: number, size: number): number[][] {
  const out: number[][] = [];
  for (let i = 0; i < n; i += size) {
    out.push(Array.from({ length: Math.min(size, n - i) }, (_, k) => i + k));
  }
  return out;
}

/** Esegue i chunk a ondate parallele, preservando l'ordine dei risultati. */
async function runChunks<R>(
  chunks: number[][],
  fn: (idxs: number[]) => Promise<R>
): Promise<R[]> {
  const out: R[] = new Array(chunks.length);
  for (let i = 0; i < chunks.length; i += MAX_PARALLEL) {
    const wave = chunks.slice(i, i + MAX_PARALLEL);
    const res = await Promise.all(wave.map((idxs) => fn(idxs)));
    res.forEach((r, k) => {
      out[i + k] = r;
    });
  }
  return out;
}

/** Output «Long» (1200 token) per chunk multi-frase o con frasi molto lunghe. */
function pickLength(texts: string[]): "Medium" | "Long" {
  const nWords = texts.join(" ").trim().split(/\s+/).filter(Boolean).length;
  return texts.length > 1 || nWords > 14 ? "Long" : "Medium";
}

/** Set delle parole latine valide (minuscole, senza punteggiatura). */
function collectWords(groups: SentenceGroup[]): Set<string> {
  const words = new Set<string>();
  for (const g of groups) {
    for (const t of g.tokens) {
      if (!t.isPunct && t.word) words.add(t.word.toLowerCase());
    }
  }
  return words;
}

/** Estrae e valida l'oggetto «enclitiche» dal JSON dell'IA (sempre un oggetto,
 *  anche vuoto: mai lanciare errori). Formato: {"tutamque": {"base":
 *  "accusativo", "enclitica": "congiunzione"}}. */
function parseEnclitiche(
  data: Record<string, unknown>,
  words: Set<string>
): Record<string, EncliticSplit> {
  const encl = (data as { enclitiche?: unknown }).enclitiche;
  if (!encl || typeof encl !== "object") return {};
  const out: Record<string, EncliticSplit> = {};
  for (const [w, v] of Object.entries(encl as Record<string, unknown>)) {
    const word = String(w).toLowerCase().trim();
    const o = (v ?? {}) as { base?: unknown; enclitica?: unknown };
    const base = String(o.base ?? "").toLowerCase().trim();
    const tipo = String(o.enclitica ?? "").toLowerCase().trim();
    if (!word || !words.has(word)) continue;
    if (!VALID_ROLES.has(base)) continue;
    if (!VALID_ENCLITICHE.has(tipo)) continue;
    out[word] = { base, enclitica: tipo };
  }
  return out;
}

/** Estrae e valida l'oggetto JSON dalla risposta dell'IA (mai lanciare errori). */
export function parseVerification(
  raw: string,
  expectedCount: number,
  words: Set<string>
): ChunkVerifyResult | null {
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) return null;
  let data: unknown;
  try {
    data = JSON.parse(m[0]);
  } catch {
    return null;
  }
  if (!data || typeof data !== "object") return null;
  const d = data as {
    traduzioni?: unknown;
    ruoli?: unknown;
    numeri?: unknown;
  };

  /* 26/10u: TOLLERANTE — con i testi lunghi il JSON dell'IA può arrivare
     troncato al limite dei token: prima bastava UNA traduzione mancante o
     malformata per buttare l'intero chunk (tutte le frasi ricadevano su
     DeepL/regole). Ora: le traduzioni valide si tengono, le altre restano
     null (il chiamante le copre con il fallback); null solo se NON ce n'è
     nemmeno una valida. */
  const rawLines = d.traduzioni;
  if (!Array.isArray(rawLines) || rawLines.length === 0) return null;
  const lines: (string | null)[] = [];
  for (const l of rawLines.slice(0, expectedCount)) {
    if (typeof l !== "string") {
      lines.push(null);
      continue;
    }
    const t = l
      .trim()
      .replace(/^\d+\s*[.)]\s*/, "")
      .replace(/^["'“”«»]+|["'“”«»]+$/g, "")
      .trim();
    lines.push(t || null);
  }
  if (lines.every((l) => l === null)) return null;

  const roles: Record<string, string> = {};
  const ruoli = d.ruoli;
  if (ruoli && typeof ruoli === "object") {
    for (const [w, r] of Object.entries(ruoli as Record<string, unknown>)) {
      const word = String(w).toLowerCase().trim();
      const role = String(r ?? "").toLowerCase().trim();
      if (!word || !words.has(word)) continue;
      if (VALID_ROLES.has(role)) roles[word] = role;
    }
  }

  // numero grammaticale (singolare/plurale) per parola: valide solo le
  // parole della frase e i valori «singolare»/«plurale»
  const numbers: Record<string, string> = {};
  const numeri = d.numeri;
  if (numeri && typeof numeri === "object") {
    for (const [w, n] of Object.entries(numeri as Record<string, unknown>)) {
      const word = String(w).toLowerCase().trim();
      const num = String(n ?? "").toLowerCase().trim();
      if (!word || !words.has(word)) continue;
      if (VALID_NUMBERS.has(num)) numbers[word] = num;
    }
  }

  return { lines, roles, numbers, enclitics: parseEnclitiche(d, words) };
}

/** Un chunk della verifica: traduzioni corrette + ruoli per parola. */
async function verifyChunk(
  texts: string[],
  currentLines: string[],
  groups: SentenceGroup[],
  words: Set<string>
): Promise<ChunkVerifyResult | null> {
  const sentencesBlock = texts
    .map((s, i) => `FRASE ${i + 1}: ${s}\nTraduzione attuale: ${currentLines[i] ?? "(mancante)"}`)
    .join("\n\n");

  try {
    const res = await generateText({
      preset: "custom-generator",
      keywords:
        "Sei un latinista e traduttore professionista, specializzato in versioni per la " +
        "scuola secondaria. Ricevi delle frasi latine con la loro traduzione automatica " +
        "italiana, che può contenere errori. Due compiti.\n\n" +
        "COMPITO 1 — CORREGGI la traduzione, rispettando SEMPRE:\n" +
        "• la voce del verbo: un verbo PASSIVO va tradotto con «essere/viene + participio " +
        "passato» («è annunciata», «viene lodato», «furono sconfitti»); non trasformarlo MAI " +
        "in attivo;\n" +
        "• persona e numero di ogni verbo (1ª singolare = io, 2ª singolare = tu, 3ª singolare " +
        "= lui/lei, 1ª plurale = noi, 2ª plurale = voi, 3ª plurale = loro); non cambiare mai " +
        "«tu» in «voi» né «io» in «noi»;\n" +
        "• il tempo verbale (presente → presente, imperfetto → imperfetto, perfetto → passato " +
        "prossimo/remoto, futuro → futuro, piuccheperfetto → trapassato prossimo);\n" +
        "• i complementi di specificazione: un GENITIVO va reso con «di/della/dei/delle» " +
        "(es. «le truppe dei Romani»), NON trasformato in aggettivo («le truppe romane»);\n" +
        "• i complementi retti da preposizione («in Italia», «a Roma», «dagli abitanti»);\n" +
        "• i nomi propri (Roma, Gallia, Cesare) e i nomi di persona.\n\n" +
        "COMPITO 2 — Assegna a OGNI parola latina il ruolo sintattico che ha nella frase " +
        "secondo la traduzione corretta, scegliendo solo tra: nominativo, genitivo, dativo, " +
        "accusativo, vocativo, ablativo, verbo, participio, funzione (preposizioni, " +
        "congiunzioni, avverbi, particelle). Il soggetto e il nome del predicato vanno in " +
        "«nominativo»; le parole che nella traduzione diventano «di/delle/dei» vanno in " +
        "«genitivo»; «in Italia»/«a Roma» in «ablativo»; i verbi in «verbo».\n\n" +
        "REGOLE DI PRECISIONE:\n" +
        DETAIL_RULES +
        "• I NOMI PROPRI di persone e luoghi (Marcus, Caesar, Roma, Gallia…) hanno SEMPRE un " +
        "caso: soggetto → «nominativo», chiamata → «vocativo», oggetto diretto → " +
        "«accusativo», specificazione («di…») → «genitivo», termine («a…») → «dativo», " +
        "complemento con preposizione o moto da luogo → «ablativo» («ad/in» + città con moto " +
        "a luogo → «accusativo»). NON lasciare MAI un nome proprio senza ruolo: se non lo " +
        "conosci, deduci il caso dalla desinenza e dal contesto (-us/-a → nominativo, " +
        "-um/-am/-em → accusativo, -i/-ae/-is → genitivo…).\n" +
        "• Gli AGGETTIVI (e i pronomi e i numerali) hanno SEMPRE lo stesso caso e numero del " +
        "nome a cui si riferiscono: individua il nome nella frase e assegna all'aggettivo lo " +
        "stesso caso e lo stesso numero. Non lasciarli MAI senza ruolo, nemmeno se il " +
        "dizionario non li conosce.\n" +
        "• NOMINATIVO vs VOCATIVO — MASSIMA ATTENZIONE, sono molto simili:\n" +
        "  il VOCATIVO è la CHIAMATA: la persona/cosa che si interroga o si esorta, spesso " +
        "introdotta da «O» o da un imperativo rivolto a lei (es. «Este, viri, filii… «, «O " +
        "Caesar…», «Amice, audi me»). SEGNALI: virgole attorno alla chiamata, un " +
        "imperativo o un'esclamazione rivolti a qualcuno, un nome che non è soggetto né " +
        "oggetto né complemento. Nella 2ª declinazione il vocativo SINGOLARE di parole in " +
        "-us finisce in -e (filius → fili! anche FILII può essere vocativo poetico di " +
        "filius; meus → mi), MA il vocativo PLURALE è identico al nominativo (-i, -ae): " +
        "in quel caso decidi SOLO dal CONTESTO — se la parola è chiamata/adlocuziona → " +
        "«vocativo». Non assegnare «nominativo» a una chiamata.\n" +
        "  ESEMPIO OBBLIGATORIO: «Este viri filii atque adversam fortunam cum patientia " +
        "tolerate.» → viri = «nominativo» e filii = «vocativo» (VIRI è il PREDICATO di «Este», " +
        "«siate UOMINI»; FILII è la CHIAMATA aggiunta, «o figli», esortata con «tolerate»).\n" +
        "  ATTENZIONE SPECIALE: dopo un IMPERATIVO DI ESORTAZIONE (Este, Estote, «state », " +
        "«endurete», «ascoltate»…) i nomi che indicano CHI È CHIAMATO sono VOCATIVO anche " +
        "senza virgole e anche se il vocativo plurale è identico al nominativo (pueri, " +
        "amici…): assegnare «nominativo» a quei nomi è un ERRORE.\n" +
        "  MA ATTENZIONE AL PREDICATO DEL NOMINATIVO: dopo la COPULA all'imperativo " +
        "(Este, Estote, Esto, Es = «sii/siate») il PRIMO nome che la segue è il PREDICATO " +
        "(«siate UOMINI» → viri = «nominativo»); SOLO i nomi successivi possono essere la " +
        "CHIAMATA («o figli» → filii = «vocativo»). Quindi: primo nome dopo la copula = " +
        "«nominativo», gli altri nomi liberi della chiamata = «vocativo».\n" +
        "• ACCUSATIVO PLURALE in -OS — MAI «nominativo» singolare: le forme «servos, " +
        "dominos, amicos, libros, deos, ventos, populos…» (nomi della 2ª declinazione in -us) " +
        "sono SEMPRE «accusativo» con numero P (complemento oggetto). Il nominativo " +
        "singolare di questi nomi finisce in -us (servus, dominus): la forma in -os NON PUÒ " +
        "essere un nominativo singolare — assegnare «nominativo» con numero S a queste forme " +
        "è un ERRORE GRAVE.\n" +
        "• Se una parola è una BASE + ENCLITICA (-que = «e», -ve = «o», -ne = interrogativa, " +
        "-cum = «con»; es. TUTAMQUE = TUTAM + QUE, TOTIDEMQUE = TOTIDEM + QUE, " +
        "AMASNE = AMAS + NE, REXNE = REX + NE, TECUM/MECUM/SECUM = TE/ME/SE + CUM), assegna alla " +
        "parola il ruolo della BASE in «ruoli» e segnala la divisione anche in «enclitiche». " +
        "ATTENZIONE: atque, neque, itaque, denique, quoque NON sono enclitiche, sono parole " +
        "intere;\n" +
        "• Le parole INDECLINABILI o sconosciute che accompagnano un nome (totidem, tot…) " +
        "prendono lo STESSO caso e numero del nome a cui si riferiscono; se una parola resta " +
        "davvero non classificabile usa la DESINENZA: -arum/-orum → genitivo plurale, " +
        "-um/-am/-em → accusativo, -os/-as → accusativo plurale, -ibus → ablativo plurale, " +
        "-us/-a → nominativo. MAI lasciare una parola senza ruolo.\n\n" +
        "COMPITO 3 — Indica il NUMERO grammaticale di ogni parola flessa (nomi, aggettivi, " +
        "pronomi, numerali, verbi, participi): «singolare» o «plurale». NON includere le " +
        "parole invariabili (preposizioni, congiunzioni, avverbi, particelle).\n\n" +
        sentencesBlock +
        "\n\nRispondi ESCLUSIVAMENTE con un oggetto JSON valido di questo schema (niente testo " +
        "fuori dal JSON, niente commenti):\n" +
        '{"traduzioni": ["traduzione frase 1", "traduzione frase 2"], "ruoli": {"parola1": ' +
        '"nominativo", "parola2": "genitivo"}, "numeri": {"parola1": "singolare", ' +
        '"parola2": "plurale"}, "enclitiche": {"tutamque": {"base": "accusativo", ' +
        '"enclitica": "congiunzione"}}}\n' +
        "Le chiavi di «ruoli» devono essere le parole latine esatte, minuscole, senza " +
        "punteggiatura. «enclitiche» è facoltativo: inserisci SOLO le parole davvero formate " +
        "da base + enclitica.",
      tone: "neutral",
      length: pickLength(texts),
      language: "Italian",
      outputs: 1,
    });
    const raw = res[0]?.name?.trim() ?? "";
    if (!raw) return null;
    return parseVerification(raw, texts.length, words);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    /* 26/10v: quota del piano esaurita (429 «limit of allowed words»):
       la segnalo a livello modulo — i chunk rimanenti e i retry non
       partono nemmeno (sarebbero altri 429 inutili che allungano l'attesa). */
    if (/429|limit of allowed words/i.test(msg)) aiQuotaHit = true;
    console.warn(
      "[IA] verifyWithAI fallita (chunk di",
      texts.length,
      "frase/i):",
      msg
    );
    return null;
  }
}

/**
 * Verifica con l'IA le traduzioni correnti e restituisce traduzioni corrette
 * e ruoli per parola. Le frasi sono processate a chunk paralleli: le frasi di
 * un chunk fallito restano `null` in `lines` (il chiamante mantiene la
 * traduzione corrente) mentre i chunk riusciti contribuiscono comunque i
 * loro ruoli. null solo se TUTTI i chunk falliscono.
 */
export async function verifyWithAI(
  texts: string[],
  currentLines: string[],
  groups: SentenceGroup[]
): Promise<AIVerifyResult | null> {
  if (texts.length === 0) return null;
  aiQuotaHit = false; // nuova richiesta: si riprova (la quota può essere tornata)
  const words = collectWords(groups);
  const chunks = chunkIndexes(texts.length, CHUNK_SIZE);

  const results = await runChunks(chunks, async (idxs) => {
    const key =
      idxs.map((i) => texts[i]).join("\u241F") +
      "\u241F" +
      idxs.map((i) => currentLines[i] ?? "").join("\u241F");
    const hit = cache.get(key);
    if (hit) return hit;
    /* 26/10v: quota esaurita → niente chiamate rimanenti */
    if (aiQuotaHit) return null;
    let r = await verifyChunk(
      idxs.map((i) => texts[i]),
      idxs.map((i) => currentLines[i] ?? ""),
      idxs.map((i) => groups[i]),
      words
    );
    /* 26/10u: un chunk fallito (rate limit/errore transitorio) non deve più
       avvelenare l'intero risultato dei testi lunghi: si riprova UNA volta
       dopo una breve pausa prima di dichiararlo fallito. */
    if (!r) {
      await new Promise((res) => setTimeout(res, 600));
      r = await verifyChunk(
        idxs.map((i) => texts[i]),
        idxs.map((i) => currentLines[i] ?? ""),
        idxs.map((i) => groups[i]),
        words
      );
    }
    if (r) {
      if (cache.size > 500) cache.clear();
      cache.set(key, r);
    }
    return r;
  });

  const lines: (string | null)[] = new Array(texts.length).fill(null);
  const roles: Record<string, string> = {};
  const numbers: Record<string, string> = {};
  const enclitics: Record<string, EncliticSplit> = {};
  let okChunks = 0;
  results.forEach((r, ci) => {
    if (!r) return;
    okChunks++;
    chunks[ci].forEach((sentenceIdx, k) => {
      lines[sentenceIdx] = r.lines[k] ?? null;
    });
    Object.assign(roles, r.roles);
    Object.assign(numbers, r.numbers);
    Object.assign(enclitics, r.enclitics);
  });

  if (okChunks === 0) return null;
  return { lines, roles, numbers, enclitics };
}

/* ------------------------------------------------------------------ */
/* Ruoli sintattici con l'IA (colorazione AI-first)                    */
/* ------------------------------------------------------------------ */

/**
 * Estrae e valida ruoli E numeri dal JSON dell'IA (mai lanciare errori).
 * I numeri sono opzionali (se il JSON non li contiene, resta una mappa vuota);
 * i ruoli devono essere presenti e validi, altrimenti restituisce null.
 */
function parseRolesAndNumbers(
  raw: string,
  words: Set<string>
): {
  roles: Record<string, string>;
  numbers: Record<string, string>;
  enclitics: Record<string, EncliticSplit>;
} | null {
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) return null;
  let data: unknown;
  try {
    data = JSON.parse(m[0]);
  } catch {
    return null;
  }
  if (!data || typeof data !== "object") return null;
  const ruoli = (data as { ruoli?: unknown }).ruoli;
  if (!ruoli || typeof ruoli !== "object") return null;
  const roles: Record<string, string> = {};
  for (const [w, r] of Object.entries(ruoli as Record<string, unknown>)) {
    const word = String(w).toLowerCase().trim();
    const role = String(r ?? "").toLowerCase().trim();
    if (!word || !words.has(word)) continue;
    if (VALID_ROLES.has(role)) roles[word] = role;
  }
  if (Object.keys(roles).length === 0) return null;
  // enclitiche (opzionali): es. {"tutamque": {"base": "accusativo",
  // "enclitica": "congiunzione"}}
  const enclitics = parseEnclitiche(data as Record<string, unknown>, words);

  const numbers: Record<string, string> = {};
  const numeri = (data as { numeri?: unknown }).numeri;
  if (numeri && typeof numeri === "object") {
    for (const [w, n] of Object.entries(numeri as Record<string, unknown>)) {
      const word = String(w).toLowerCase().trim();
      const num = String(n ?? "").toLowerCase().trim();
      if (!word || !words.has(word)) continue;
      if (VALID_NUMBERS.has(num)) numbers[word] = num;
    }
  }
  return { roles, numbers, enclitics };
}

/**
 * Estrae e valida la mappa dei ruoli dal JSON dell'IA (mai lanciare errori).
 * Restituisce null se il JSON è malformato o non contiene ruoli validi.
 */
export function parseRoles(
  raw: string,
  words: Set<string>
): Record<string, string> | null {
  const res = parseRolesAndNumbers(raw, words);
  return res ? res.roles : null;
}

/** Un chunk dell'assegnazione ruoli: mappa parola → ruolo (+ numero). */
async function assignRolesChunk(
  texts: string[],
  lines: string[],
  groups: SentenceGroup[],
  words: Set<string>
): Promise<AIRolesResult | null> {
  const sentencesBlock = texts
    .map(
      (s, i) =>
        `FRASE ${i + 1}: ${s}` +
        (lines[i] ? `\nTraduzione italiana: ${lines[i]}` : "")
    )
    .join("\n\n");

  try {
    const res = await generateText({
      preset: "custom-generator",
      keywords:
        "Sei un latinista e traduttore professionista, specializzato in versioni per la " +
        "scuola secondaria.\n\n" +
        "Assegna a OGNI parola latina il ruolo sintattico che ha nella frase, scegliendo " +
        "solo tra: nominativo, genitivo, dativo, accusativo, vocativo, ablativo, verbo, " +
        "participio, funzione (preposizioni, congiunzioni, avverbi, particelle).\n" +
        "Regole:\n" +
        DETAIL_RULES +
        "• il soggetto e il nome del predicato vanno in «nominativo»;\n" +
        "• le parole che nella traduzione diventano «di/della/dei/delle» vanno in «genitivo»;\n" +
        "• i complementi introdotti da «in/a/con/da/per» vanno in «ablativo» (con «a» + nome " +
        "proprio di città, moto a luogo → «accusativo»);\n" +
        "• il complemento di termine («a chi? a che cosa?») va in «dativo»;\n" +
        "• il complemento oggetto va in «accusativo»;\n" +
        "• i verbi (anche le forme nominali finite) vanno in «verbo»;\n" +
        "• preposizioni, congiunzioni, avverbi e particelle vanno in «funzione»;\n" +
        "• le parole ambigue vanno nel ruolo che hanno IN QUESTA FRASE, non nel più comune;\n" +
        "• I NOMI PROPRI di persone e luoghi (Marcus, Caesar, Roma, Gallia…) hanno SEMPRE un " +
        "caso: soggetto → «nominativo», chiamata → «vocativo», oggetto diretto → " +
        "«accusativo», specificazione («di…») → «genitivo», termine («a…») → «dativo», " +
        "complemento con preposizione o moto da luogo → «ablativo» («ad/in» + città con moto " +
        "a luogo → «accusativo»). NON lasciare MAI un nome proprio senza ruolo: se non lo " +
        "conosci, deduci il caso dalla desinenza e dal contesto (-us/-a → nominativo, " +
        "-um/-am/-em → accusativo, -i/-ae/-is → genitivo…);\n" +
        "• Gli AGGETTIVI (e i pronomi e i numerali) hanno SEMPRE lo stesso caso e numero del " +
        "nome a cui si riferiscono: individua il nome nella frase e assegna all'aggettivo lo " +
        "stesso caso e lo stesso numero. Non lasciarli MAI senza ruolo, nemmeno se il " +
        "dizionario non li conosce;\n" +
        "• NOMINATIVO vs VOCATIVO — MASSIMA ATTENZIONE, sono molto simili:\n" +
        "  il VOCATIVO è la CHIAMATA: la persona/cosa che si interroga o si esorta, spesso " +
        "introdotta da «O» o da un imperativo rivolto a lei (es. «Este, viri, filii… «, «O " +
        "Caesar…», «Amice, audi me»). SEGNALI: virgole attorno alla chiamata, un " +
        "imperativo o un'esclamazione rivolti a qualcuno, un nome che non è soggetto né " +
        "oggetto né complemento. Nella 2ª declinazione il vocativo SINGOLARE di parole in " +
        "-us finisce in -e (filius → fili! anche FILII può essere vocativo poetico di " +
        "filius; meus → mi), MA il vocativo PLURALE è identico al nominativo (-i, -ae): " +
        "in quel caso decidi SOLO dal CONTESTO — se la parola è chiamata/adlocuziona → " +
        "«vocativo». Non assegnare «nominativo» a una chiamata;\n" +
        "  ESEMPIO OBBLIGATORIO: «Este viri filii atque adversam fortunam cum patientia " +
        "tolerate.» → viri = «nominativo» e filii = «vocativo» (VIRI è il PREDICATO di «Este», " +
        "«siate UOMINI»; FILII è la CHIAMATA aggiunta, «o figli», esortata con «tolerate»);\n" +
        "  ATTENZIONE SPECIALE: dopo un IMPERATIVO DI ESORTAZIONE (Este, Estote, «state », " +
        "«endurete», «ascoltate»…) i nomi che indicano CHI È CHIAMATO sono VOCATIVO anche " +
        "senza virgole e anche se il vocativo plurale è identico al nominativo (pueri, " +
        "amici…): assegnare «nominativo» a quei nomi è un ERRORE.\n" +
        "  MA ATTENZIONE AL PREDICATO DEL NOMINATIVO: dopo la COPULA all'imperativo " +
        "(Este, Estote, Esto, Es = «sii/siate») il PRIMO nome che la segue è il PREDICATO " +
        "(«siate UOMINI» → viri = «nominativo»); SOLO i nomi successivi possono essere la " +
        "CHIAMATA («o figli» → filii = «vocativo»). Quindi: primo nome dopo la copula = " +
        "«nominativo», gli altri nomi liberi della chiamata = «vocativo».\n" +
        "• ACCUSATIVO PLURALE in -OS — MAI «nominativo» singolare: le forme «servos, " +
        "dominos, amicos, libros, deos, ventos, populos…» (nomi della 2ª declinazione in -us) " +
        "sono SEMPRE «accusativo» con numero P (complemento oggetto). Il nominativo " +
        "singolare di questi nomi finisce in -us (servus, dominus): la forma in -os NON PUÒ " +
        "essere un nominativo singolare — assegnare «nominativo» con numero S a queste forme " +
        "è un ERRORE GRAVE.\n" +
        "• se una parola è una BASE + ENCLITICA (-que = «e», -ve = «o», -ne = interrogativa, " +
        "-cum = «con»; es. TUTAMQUE = TUTAM + QUE, TOTIDEMQUE = TOTIDEM + QUE, " +
        "AMASNE = AMAS + NE, REXNE = REX + NE, TECUM/MECUM/SECUM = TE/ME/SE + CUM), assegna alla " +
        "parola il ruolo della BASE in «ruoli» e segnala la divisione anche in " +
        "«enclitiche»; ATTENZIONE: atque, neque, itaque, denique, quoque NON sono " +
        "enclitiche, sono parole intere;\n" +
        "• le parole INDECLINABILI o sconosciute che accompagnano un nome (totidem, tot…) " +
        "prendono lo STESSO caso e numero del nome a cui si riferiscono; se una parola resta " +
        "davvero non classificabile usa la DESINENZA: -arum/-orum → genitivo plurale, " +
        "-um/-am/-em → accusativo, -os/-as → accusativo plurale, -ibus → ablativo plurale, " +
        "-us/-a → nominativo. MAI lasciare una parola senza ruolo;\n" +
        "• indica anche il NUMERO grammaticale (singolare/plurale) di ogni parola flessa " +
        "(nomi, aggettivi, pronomi, numerali, verbi, participi): NIENTE numero per le parole " +
        "invariabili (preposizioni, congiunzioni, avverbi).\n\n" +
        sentencesBlock +
        "\n\nRispondi ESCLUSIVAMENTE con un oggetto JSON valido (niente testo fuori dal JSON, " +
        "niente commenti):\n" +
        '{"ruoli": {"parola1": "nominativo", "parola2": "genitivo"}, "numeri": ' +
        '{"parola1": "singolare", "parola2": "plurale"}, "enclitiche": {"tutamque": ' +
        '{"base": "accusativo", "enclitica": "congiunzione"}}}\n' +
        "Le chiavi di «ruoli» devono essere le parole latine esatte, minuscole, senza " +
        "punteggiatura. «enclitiche» è facoltativo: inserisci SOLO le parole davvero formate " +
        "da base + enclitica.",
      tone: "neutral",
      length: pickLength(texts),
      language: "Italian",
      outputs: 1,
    });
    const raw = res[0]?.name?.trim() ?? "";
    if (!raw) return null;
    return parseRolesAndNumbers(raw, words);
  } catch (err) {
    console.warn(
      "[IA] assignRolesWithAI fallita (chunk di",
      texts.length,
      "frase/i):",
      err instanceof Error ? err.message : err
    );
    return null;
  }
}

/**
/** Ruoli (+ numeri S/P) assegnati dall'IA per la colorazione. */
export interface AIRolesResult {
  roles: Record<string, string>;
  numbers: Record<string, string>;
  /** Parole formate da base + enclitica (es. tutamque = tutam + que) */
  enclitics: Record<string, EncliticSplit>;
}

/**
 * Assegna con l'IA il ruolo sintattico di OGNI parola latina (per la
 * colorazione) e il numero grammaticale (singolare/plurale per l'apice S/P).
 * A differenza di `verifyWithAI` NON corregge la traduzione:
 * riceve le frasi latine (e, se disponibile, la traduzione italiana mostrata)
 * e restituisce le mappe parola → ruolo e parola → numero. Le frasi sono
 * processate a chunk paralleli: i chunk falliti non contribuiscono ruoli,
 * quelli riusciti sì. Best-effort: null solo se TUTTI i chunk falliscono.
 * Risultati in cache in memoria per chunk.
 */
export async function assignRolesWithAI(
  texts: string[],
  lines: string[],
  groups: SentenceGroup[]
): Promise<AIRolesResult | null> {
  if (texts.length === 0) return null;
  const words = collectWords(groups);
  const chunks = chunkIndexes(texts.length, CHUNK_SIZE);

  const results = await runChunks(chunks, async (idxs) => {
    const key =
      "roles:" +
      idxs.map((i) => texts[i]).join("\u241F") +
      "\u241F" +
      idxs.map((i) => lines[i] ?? "").join("\u241F");
    const hit = rolesCache.get(key);
    if (hit) return hit;
    const r = await assignRolesChunk(
      idxs.map((i) => texts[i]),
      idxs.map((i) => lines[i] ?? ""),
      idxs.map((i) => groups[i]),
      words
    );
    if (r) {
      if (rolesCache.size > 500) rolesCache.clear();
      rolesCache.set(key, r);
    }
    return r;
  });

  const roles: Record<string, string> = {};
  const numbers: Record<string, string> = {};
  const enclitics: Record<string, EncliticSplit> = {};
  let okChunks = 0;
  for (const r of results) {
    if (r) {
      okChunks++;
      Object.assign(roles, r.roles);
      Object.assign(numbers, r.numbers);
      Object.assign(enclitics, r.enclitics);
    }
  }
  return okChunks > 0 ? { roles, numbers, enclitics } : null;
}
