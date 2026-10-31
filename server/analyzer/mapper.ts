/**
 * Mappa i risultati grezzi di Collatinus verso le opzioni strutturate
 * (POS, caso, modo, etichette in italiano, colori del PDF).
 */

import type {
  AnalysisOption,
  CaseName,
  MoodName,
  PosCategory,
} from "../../shared/types";
import { stripDiacritics } from "./normalize";
import type { RawLemma, RawWordResult } from "./collatinus";

const NOMINAL_CASES: Record<string, CaseName> = {
  nominatif: "nominativo",
  génitif: "genitivo",
  genitif: "genitivo",
  datif: "dativo",
  accusatif: "accusativo",
  vocatif: "vocativo",
  ablatif: "ablativo",
};

const MOODS: Record<string, MoodName> = {
  indicatif: "indicativo",
  subjonctif: "congiuntivo",
  infinitif: "infinito",
  participe: "participio",
  impératif: "imperativo",
  imperatif: "imperativo",
  gérondif: "gerundio",
  gerondif: "gerundio",
  supin: "supino",
};

/** Riconosce la categoria grammaticale dal riassunto morfologico (<em>) */
export function posFromSummary(summary: string): PosCategory | null {
  const s = summary.toLowerCase();
  if (s.includes("conj.")) return "congiunzione";
  if (s.includes("prép.") || s.includes("prep.")) return "preposizione";
  if (s.includes("adv.")) return "avverbio";
  if (s.includes("excl.") || s.includes("interj.")) return "interiezione";
  if (s.includes("pron.")) return "pronome";
  if (s.includes("num.")) return "numerale";
  if (s.includes("adj.")) return "aggettivo";
  if (s.includes("part.")) return "participio";
  // verbo: presenza di un infinito (are/ere/ire/esse/iri) come token
  const tokens = s.replace(/[.,;:]/g, " ").split(/\s+/).map((t) => stripDiacritics(t).toLowerCase());
  if (tokens.some((t) => ["are", "ere", "ire", "esse", "iri"].includes(t))) return "verbo";
  // nome: riassunto che termina con il genere (m., f., n.)
  const trimmed = s.trim();
  if (/[mfn]\.$/.test(trimmed) && trimmed.includes(",")) return "nome";
  // aggettivo: terminazioni tipiche
  if (/(us, a, um|a, um|is, e|er, era, erum|ior, ius|ius, a, um|ra, rum|chra, chrum|tra, trum)/.test(s)) return "aggettivo";
  return null;
}

interface ParsedDesc {
  case?: CaseName;
  number?: "singolare" | "plurale";
  gender?: "maschile" | "femminile" | "neutro";
  person?: 1 | 2 | 3;
  mood?: MoodName;
  tense?: string;
  voice?: "attivo" | "passivo";
  degree?: "positivo" | "comparativo" | "superlativo";
  isVerbal: boolean; // contiene indicazioni di modo verbale
}

/** Analizza una riga di descrizione francese (es. "3ème singulier indicatif présent actif") */
export function parseDesc(desc: string): ParsedDesc {
  const d = desc.toLowerCase();
  const res: ParsedDesc = { isVerbal: false };
  for (const [fr, it] of Object.entries(NOMINAL_CASES)) {
    if (d.includes(fr)) {
      res.case = it;
      break;
    }
  }
  if (d.includes("pluriel")) res.number = "plurale";
  else if (d.includes("singulier")) res.number = "singolare";
  if (d.includes("féminin") || d.includes("feminin")) res.gender = "femminile";
  else if (d.includes("masculin")) res.gender = "maschile";
  else if (d.includes("neutre")) res.gender = "neutro";
  for (const [fr, it] of Object.entries(MOODS)) {
    if (d.includes(fr)) {
      res.mood = it;
      res.isVerbal = true;
      break;
    }
  }
  if (d.includes("adjectif verbal")) {
    res.mood = "gerundivo";
    res.isVerbal = true;
  }
  if (d.includes("présent") || d.includes("present")) res.tense = "presente";
  else if (d.includes("imparfait")) res.tense = "imperfetto";
  else if (d.includes("parfait")) res.tense = "perfetto";
  else if (d.includes("pqp") || d.includes("plus-que-parfait")) res.tense = "piuccheperfetto";
  else if (d.includes("futur")) res.tense = "futuro";
  if (d.includes("passif")) res.voice = "passivo";
  else if (d.includes("actif")) res.voice = "attivo";
  if (d.includes("positif")) res.degree = "positivo";
  else if (d.includes("comparatif")) res.degree = "comparativo";
  else if (d.includes("superlatif")) res.degree = "superlativo";
  const pm = d.match(/([123])\s*(?:ère|ème|e|me)\b/);
  if (pm) res.person = parseInt(pm[1], 10) as 1 | 2 | 3;
  return res;
}

/** Descrizione italiana breve di un'opzione */
export function describeOption(o: {
  pos: PosCategory;
  case?: CaseName;
  number?: "singolare" | "plurale";
  gender?: "maschile" | "femminile" | "neutro";
  mood?: MoodName;
  tense?: string;
  voice?: "attivo" | "passivo";
  person?: number;
  degree?: string;
}): string {
  const p = o.pos;
  if (p === "verbo" && o.mood) {
    const moodIt: Record<string, string> = {
      indicativo: "indicativo",
      congiuntivo: "congiuntivo",
      imperativo: "imperativo",
      infinito: "infinito",
      participio: "participio",
      gerundio: "gerundio",
      gerundivo: "gerundivo",
      supino: "supino",
    };
    let s = moodIt[o.mood];
    if (o.tense && (o.mood === "indicativo" || o.mood === "congiuntivo")) s += ` ${o.tense}`;
    if (o.mood === "infinito" || o.mood === "participio") {
      if (o.tense) s += ` ${o.tense}`;
      if (o.voice) s += ` ${o.voice}`;
    }
    if (o.person && (o.mood === "indicativo" || o.mood === "congiuntivo" || o.mood === "imperativo")) {
      s += `, ${o.person}ª ${o.number === "plurale" ? "plurale" : "singolare"}`;
    }
    if (o.voice && o.mood !== "infinito" && o.mood !== "participio") s += ` ${o.voice}`;
    return s.trim();
  }
  if ((p === "nome" || p === "aggettivo" || p === "pronome" || p === "numerale") && o.case) {
    let s = o.case;
    if (o.gender) s += ` ${o.gender}`;
    if (o.number) s += ` ${o.number}`;
    if (o.degree) s += ` (${o.degree})`;
    return s;
  }
  if (o.degree) return `${p} (${o.degree})`;
  return p;
}

/** Converte un lemma grezzo in opzioni di analisi */
export function lemmaToOptions(lemma: RawLemma): AnalysisOption[] {
  const posGuess = posFromSummary(lemma.summary);
  const opts: AnalysisOption[] = [];
  if (lemma.lines.length === 0) {
    // parola-funzione: la categoria è nel riassunto
    const pos = posGuess ?? "sconosciuto";
    opts.push({
      lemma: lemma.lemma,
      summary: lemma.summary,
      translation: lemma.translation,
      form: lemma.lemma,
      pos,
      freq: lemma.freq,
      desc: pos,
      raw: "",
    });
    return opts;
  }
  for (const line of lemma.lines) {
    const parsed = parseDesc(line.desc);
    let pos: PosCategory = "sconosciuto";
    if (parsed.isVerbal) pos = "verbo";
    else if (parsed.case) {
      if (posGuess && ["nome", "aggettivo", "pronome", "numerale", "participio"].includes(posGuess)) {
        pos = posGuess;
      } else if (parsed.gender) {
        // le righe degli aggettivi portano il genere (féminin/masculin/neutre)
        pos = "aggettivo";
      } else {
        pos = "nome";
      }
    } else {
      pos = posGuess ?? "sconosciuto";
    }
    opts.push({
      lemma: lemma.lemma,
      summary: lemma.summary,
      translation: lemma.translation,
      form: line.form,
      pos,
      case: parsed.case,
      number: parsed.number,
      gender: parsed.gender,
      person: parsed.person,
      mood: parsed.mood,
      tense: parsed.tense,
      voice: parsed.voice,
      degree: parsed.degree,
      freq: lemma.freq,
      desc: describeOption({ ...parsed, pos }),
      raw: line.desc,
    });
  }
  return opts;
}

/** Converte il risultato grezzo in lista piatta di opzioni */
export function rawToOptions(raw: RawWordResult): AnalysisOption[] {
  const all: AnalysisOption[] = [];
  for (const lemma of raw.lemmas) {
    all.push(...lemmaToOptions(lemma));
  }
  // ordina per frequenza decrescente
  all.sort((a, b) => b.freq - a.freq);
  return all;
}
