/**
 * Adattatore per whitakers-words: il dizionario/morfologia di Whitaker
 * (39.000 voci) gira interamente offline nel server. È il motore primario
 * dell'app: riconosce POS, caso, numero, genere, modo, tempo, voce e
 * restituisce anche il significato (inglese) e la forma di dizionario.
 */

import { createEngine, formatWordAnalysis } from "whitakers-words/node";
import type {
  AnalysisOption,
  CaseName,
  MoodName,
  PosCategory,
} from "../../shared/types";
import { normalizeWord, stripDiacritics } from "./normalize";
import { IT_GLOSS } from "./itGloss";
import { IT_GLOSS_VERBS } from "./itGlossVerbs";
import { IT_GLOSS_EXTRA } from "./itGlossExtra";

let engine: ReturnType<typeof createEngine> | null = null;

export function getEngine() {
  if (!engine) engine = createEngine();
  return engine;
}

/* ------------------------------------------------------------------ */
/* Mappe dai codici Whitaker alle etichette italiane                   */
/* ------------------------------------------------------------------ */
const CASE_IT: Record<string, CaseName> = {
  NOM: "nominativo",
  GEN: "genitivo",
  DAT: "dativo",
  ACC: "accusativo",
  VOC: "vocativo",
  ABL: "ablativo",
  LOC: "ablativo", // locativo → ablativo (stato in luogo)
};

const NUM_IT: Record<string, "singolare" | "plurale"> = {
  S: "singolare",
  P: "plurale",
};

const GEN_IT: Record<string, "maschile" | "femminile" | "neutro"> = {
  M: "maschile",
  F: "femminile",
  N: "neutro",
};

const TENSE_IT: Record<string, string> = {
  PRES: "presente",
  IMPF: "imperfetto",
  FUT: "futuro",
  PERF: "perfetto",
  PLUP: "piuccheperfetto",
  FUTP: "futuro anteriore",
};

const VOICE_IT: Record<string, "attivo" | "passivo"> = {
  ACTIVE: "attivo",
  PASSIVE: "passivo",
};

const MOOD_IT: Record<string, MoodName> = {
  IND: "indicativo",
  SUB: "congiuntivo",
  IMP: "imperativo",
  INF: "infinito",
};

const POS_IT: Record<string, PosCategory> = {
  N: "nome",
  PRON: "pronome",
  PACK: "particella",
  ADJ: "aggettivo",
  NUM: "numerale",
  ADV: "avverbio",
  V: "verbo",
  VPAR: "verbo",
  SUPINE: "verbo",
  PREP: "preposizione",
  CONJ: "congiunzione",
  INTERJ: "interiezione",
  X: "sconosciuto",
};

const FREQ_NUM: Record<string, number> = {
  A: 12,
  B: 9,
  C: 7,
  D: 5,
  E: 3,
  F: 1,
  I: 0,
  M: 0,
  N: 0,
  X: 0,
};

interface WWResult {
  stem: string;
  ir: {
    qual: {
      pofs: string;
      noun?: { decl: { which: number }; cs: string; number: string; gender: string };
      pron?: { decl: { which: number }; cs: string; number: string; gender: string };
      pack?: { decl: { which: number }; cs: string; number: string; gender: string };
      adj?: { decl: { which: number }; cs: string; number: string; gender: string; comparison: string };
      num?: { decl: { which: number }; cs: string; number: string; gender: string; sort: string };
      adv?: { comparison: string };
      verb?: {
        con: { which: number };
        tenseVoiceMood: { tense: string; voice: string; mood: string };
        person: number;
        number: string;
      };
      vpar?: {
        con: { which: number };
        cs: string;
        number: string;
        gender: string;
        tenseVoiceMood: { tense: string; voice: string; mood: string };
      };
      supine?: { con: { which: number }; cs: string; number: string; gender: string };
      prep?: { cs: string };
    };
    freq?: string;
  };
  de: { mean: string; tran: { freq: string } };
}

function itCase(cs: string): CaseName | undefined {
  return CASE_IT[cs];
}

function itNum(n: string): "singolare" | "plurale" | undefined {
  return NUM_IT[n];
}

function itGen(g: string): "maschile" | "femminile" | "neutro" | undefined {
  return GEN_IT[g];
}

function degreeIt(c: string): "positivo" | "comparativo" | "superlativo" | undefined {
  if (c === "POS") return "positivo";
  if (c === "COMP") return "comparativo";
  if (c === "SUPER") return "superlativo";
  return undefined;
}

/** Descrizione italiana per i participi/gerundivi (con caso/numero/genere) */
function vparDesc(mood: MoodName, tense?: string, voice?: string, cs?: string, num?: string, gen?: string): string {
  let s = mood === "gerundivo" ? "gerundivo" : `participio ${tense ?? ""} ${voice ?? ""}`.trim();
  if (cs && cs !== "X") {
    const c = itCase(cs);
    const n = itNum(num ?? "");
    const g = itGen(gen ?? "");
    s += ` · ${c ?? cs} ${n ?? ""} ${g ?? ""}`;
  }
  return s;
}

function posName(p: PosCategory): string {
  const names: Record<string, string> = {
    nome: "nome",
    aggettivo: "aggettivo",
    verbo: "verbo",
    avverbio: "avverbio",
    pronome: "pronome",
    preposizione: "preposizione",
    congiunzione: "congiunzione",
    interiezione: "interiezione",
    particella: "particella",
    numerale: "numerale",
    sconosciuto: "parola sconosciuta",
  };
  return names[p] ?? p;
}

/**
 * Analizza una parola latina con Whitaker e restituisce le opzioni
 * strutturate (stesso formato usato da Collatinus).
 */
export function parseWhitaker(word: string): AnalysisOption[] {
  const lower = normalizeWord(word);
  if (!/^[a-z']+$/.test(lower)) return [];
  const analysis = getEngine().parseWord(lower);
  const results = (analysis.results ?? []) as unknown as WWResult[];
  if (results.length === 0) return [];

  // Forma di dizionario: dalla riga della voce (quella con [XXXXX])
  let entryLine = "";
  try {
    const fmt = formatWordAnalysis(analysis);
    entryLine =
      fmt
        .split("\n")
        .map((l) => l.trim())
        .find((l) => /\[[A-Z]{5}\]/.test(l)) ?? "";
  } catch {
    entryLine = "";
  }
  const entryPart = entryLine.split(/\s{2,}/)[0]?.trim() ?? "";
  const lemma = stripDiacritics(entryPart) || lower;

  const opts: AnalysisOption[] = [];
  for (const r of results) {
    const q = r.ir.qual;
    const pofs = q.pofs;
    const freq = FREQ_NUM[r.de.tran?.freq ?? "X"] ?? 0;

    // lemma chiave per il glossario italiano (primo token della voce)
    const key = normalizeWord(lemma.split(",")[0]?.trim() ?? "");
    const translation = IT_GLOSS[key] ?? IT_GLOSS_VERBS[key] ?? IT_GLOSS_EXTRA[key] ?? "";

    // ---- VERBI FINITI / INFINITI ----
    if (pofs === "V" && q.verb) {
      const v = q.verb;
      const tvm = v.tenseVoiceMood;
      const mood = MOOD_IT[tvm.mood] ?? "indicativo";
      opts.push({
        lemma,
        summary: `verbo · ${v.con.which}ª coniug.`,
        translation,
        form: lower,
        pos: "verbo",
        mood,
        tense: TENSE_IT[tvm.tense],
        voice: VOICE_IT[tvm.voice],
        person: v.person && v.person !== 0 ? (v.person as 1 | 2 | 3) : undefined,
        number: itNum(v.number),
        freq,
        desc: verbDesc(mood, tvm.tense, tvm.voice, v.person, v.number),
        raw: `${tvm.tense} ${tvm.voice} ${tvm.mood} ${v.person} ${v.number}`,
      });
      continue;
    }

    // ---- PARTICIPI / GERUNDIVI / SUPINI ----
    if (pofs === "VPAR" && q.vpar) {
      const vp = q.vpar;
      const tvm = vp.tenseVoiceMood;
      const mood: MoodName =
        tvm.mood === "PPL" && tvm.tense === "FUT" && tvm.voice === "PASSIVE"
          ? "gerundivo"
          : "participio";
      opts.push({
        lemma,
        summary: "forma verbale",
        translation,
        form: lower,
        pos: "verbo",
        mood,
        tense: TENSE_IT[tvm.tense],
        voice: VOICE_IT[tvm.voice],
        case: itCase(vp.cs),
        number: itNum(vp.number),
        gender: itGen(vp.gender),
        freq,
        desc: vparDesc(mood, TENSE_IT[tvm.tense], VOICE_IT[tvm.voice], vp.cs, vp.number, vp.gender),
        raw: `VPAR ${tvm.tense} ${tvm.voice} ${vp.cs} ${vp.number} ${vp.gender}`,
      });
      continue;
    }

    if (pofs === "SUPINE") {
      const su = q.supine;
      opts.push({
        lemma,
        summary: "supino",
        translation,
        form: lower,
        pos: "verbo",
        mood: "supino",
        case: itCase(su?.cs ?? "X"),
        number: itNum(su?.number ?? "X"),
        gender: itGen(su?.gender ?? "X"),
        freq,
        desc: "supino",
        raw: `SUPINE ${su?.cs ?? ""}`,
      });
      continue;
    }

    // ---- NOMI, AGGETTIVI, PRONOMI, NUMERALI ----
    const nominal =
      q.noun ?? q.pron ?? q.pack ?? q.adj ?? q.num;
    if (nominal) {
      const pos = POS_IT[pofs] ?? "nome";
      const cs = nominal.cs ?? "X";
      opts.push({
        lemma,
        summary: summaryForNominal(pofs, nominal.decl?.which, q.adj?.comparison, q.num?.sort),
        translation,
        form: lower,
        pos,
        case: itCase(cs),
        number: itNum(nominal.number),
        gender: itGen(nominal.gender),
        degree: q.adj ? degreeIt(q.adj.comparison) : undefined,
        freq,
        desc: nominalDesc(pos, cs, nominal.number, nominal.gender, q.adj?.comparison),
        raw: `${pofs} ${cs} ${nominal.number} ${nominal.gender}`,
      });
      continue;
    }

    // ---- AVVERBI ----
    if (pofs === "ADV") {
      const deg = degreeIt(q.adv?.comparison ?? "X");
      opts.push({
        lemma,
        summary: "avverbio",
        translation,
        form: lower,
        pos: "avverbio",
        degree: deg,
        freq,
        desc: deg && deg !== "positivo" ? `avverbio (${deg})` : "avverbio",
        raw: `ADV ${q.adv?.comparison ?? ""}`,
      });
      continue;
    }

    // ---- PREPOSIZIONI, CONGIUNZIONI, INTERIEZIONI, PARTICELLE ----
    const pos = POS_IT[pofs] ?? "sconosciuto";
    opts.push({
      lemma,
      summary: "",
      translation,
      form: lower,
      pos,
      freq,
      desc: posName(pos),
      raw: pofs,
    });
  }

  return opts;
}

/**
 * Letture doppie comuni (forme ambigue): nei testi scolastici il soggetto è
 * molto più frequente del complemento, quindi quando la forma coincide con un
 * genitivo singolare (-i maschile, -ae femminile) o con un accusativo plurale
 * (-es), porta in testa la lettura di nominativo plurale («pueri» = i ragazzi,
 * «homines» = gli uomini, «puellae» = le ragazze, «filii» = i figli).
 * Applicata a QUALSIASI sorgente (Whitaker, Collatinus, override).
 */
export function augmentDualReadings(opts: AnalysisOption[]): AnalysisOption[] {
  if (opts.length === 0 || !opts.every((o) => o.form === opts[0].form)) return opts;
  const f = normalizeWord(opts[0].form);
  const candidates: AnalysisOption[] = [];
  for (const o of opts) {
    if (o.pos === "sconosciuto") continue;
    const isGenSg = o.case === "genitivo" && o.number === "singolare";
    const fitsI = isGenSg && o.gender === "maschile" && f.endsWith("i");
    // -ae vale sia per i femminili («puellae») sia per i maschili di 1ª
    // declinazione («nautae», «agricolae», «poetae»), che Whitaker elenca
    // solo come genitivo/dativo singolare: senza il nominativo plurale il
    // soggetto verrebbe colorato come genitivo.
    const fitsAe =
      isGenSg &&
      (o.gender === "femminile" || o.gender === "maschile") &&
      f.endsWith("ae");
    const fitsEs =
      o.case === "accusativo" &&
      o.number === "plurale" &&
      f.endsWith("es") &&
      (o.pos === "nome" || o.pos === "aggettivo");
    if (!fitsI && !fitsAe && !fitsEs) continue;
    const existing = opts.find(
      (x) =>
        x.pos === o.pos &&
        x.case === "nominativo" &&
        x.number === "plurale" &&
        (x.gender ?? "") === (o.gender ?? "")
    );
    if (existing) {
      candidates.push({ ...existing, freq: (o.freq ?? 0) + 1 });
    } else {
      candidates.push({
        ...o,
        case: "nominativo",
        number: "plurale",
        freq: (o.freq ?? 0) + 1,
        desc: `nominativo ${o.gender ?? ""} plurale`.trim(),
      });
    }
  }
  if (candidates.length === 0) return opts;
  candidates.sort((a, b) => (b.freq ?? 0) - (a.freq ?? 0));
  const seen = new Set<string>();
  const front: AnalysisOption[] = [];
  for (const c of candidates) {
    const k = `${c.pos}|${c.gender ?? ""}`;
    if (seen.has(k)) continue;
    seen.add(k);
    front.push(c);
  }
  // rimuove le vecchie voci identiche a quelle promosse (evita doppioni nel dialog)
  const promoted = new Set(front.map((c) => `${c.pos}|${c.case ?? ""}|${c.number ?? ""}|${c.gender ?? ""}|${c.desc}`));
  const rest = opts.filter((o) => {
    const k = `${o.pos}|${o.case ?? ""}|${o.number ?? ""}|${o.gender ?? ""}|${o.desc}`;
    return !promoted.has(k);
  });
  return [...front, ...rest];
}

function verbDesc(
  mood: MoodName,
  tense?: string,
  voice?: string,
  person?: number,
  number?: string
): string {
  const t = tense ? TENSE_IT[tense] : "";
  const v = voice ? VOICE_IT[voice] : "";
  const n = number ? NUM_IT[number] : "";
  if (mood === "infinito") return `infinito ${t} ${v}`.trim();
  if (mood === "imperativo") {
    let s = `imperativo ${t} ${v}`.trim();
    if (person) s += `, ${person}ª ${n ?? ""}`.trim();
    return s;
  }
  let s = `${mood} ${t}`.trim();
  if (person) s += `, ${person}ª ${n ?? ""}`.trim();
  if (v) s += ` ${v}`;
  return s.trim();
}

function summaryForNominal(pofs: string, decl?: number, comp?: string, sort?: string): string {
  if (pofs === "ADJ") return `aggettivo · ${decl ?? "?"}ª decl.${comp ? " · " + degreeIt(comp) : ""}`;
  if (pofs === "NUM") return `numerale${sort === "ORD" ? " ordinale" : ""}`;
  if (pofs === "PRON") return "pronome";
  if (pofs === "PACK") return "particella";
  return `nome · ${decl ?? "?"}ª decl.`;
}

function nominalDesc(
  pos: PosCategory,
  cs: string,
  number?: string,
  gender?: string,
  comp?: string
): string {
  if (cs === "X" || cs === "") {
    if (pos === "aggettivo") return "aggettivo" + (comp ? ` (${degreeIt(comp)})` : "");
    return pos === "nome" ? "nome indeclinabile" : posName(pos);
  }
  let s = `${itCase(cs) ?? cs}`;
  const g = itGen(gender ?? "");
  if (g) s += ` ${g}`;
  const n = itNum(number ?? "");
  if (n) s += ` ${n}`;
  if (pos === "aggettivo" && comp) s += ` (${degreeIt(comp)})`;
  return s;
}
