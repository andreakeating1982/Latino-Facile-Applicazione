/**
 * Unified type exports
 * Import shared types from this single entry point.
 */

export type * from "../drizzle/schema";
export * from "./_core/errors";

/* =====================================================================
   LATINO FACILE · Colora le frasi — tipi condivisi
   ===================================================================== */

/** Categorie grammaticali usate dall'app (etichette in italiano) */
export type PosCategory =
  | "nome"
  | "aggettivo"
  | "verbo"
  | "avverbio"
  | "pronome"
  | "preposizione"
  | "congiunzione"
  | "interiezione"
  | "particella"
  | "numerale"
  | "participio"
  | "punteggiatura"
  | "sconosciuto";

export type CaseName =
  | "nominativo"
  | "genitivo"
  | "dativo"
  | "accusativo"
  | "vocativo"
  | "ablativo";

export type MoodName =
  | "indicativo"
  | "congiuntivo"
  | "imperativo"
  | "infinito"
  | "participio"
  | "gerundio"
  | "gerundivo"
  | "supino";

/** Una singola analisi possibile per una parola */
export interface AnalysisOption {
  lemma: string; // lemma senza diacritici
  summary: string; // riassunto morfologico originale (es. "i, m.")
  translation: string; // traduzione italiana (se disponibile)
  form: string; // forma flessa senza diacritici (es. "pulchra")
  pos: PosCategory;
  case?: CaseName;
  number?: "singolare" | "plurale";
  gender?: "maschile" | "femminile" | "neutro";
  person?: 1 | 2 | 3;
  mood?: MoodName;
  tense?: string;
  voice?: "attivo" | "passivo";
  degree?: "positivo" | "comparativo" | "superlativo";
  freq: number; // frequenza (ordina le analisi)
  desc: string; // descrizione breve in italiano per la UI
  raw: string; // descrizione originale (francese) di Collatinus
}

/** Analisi completa di una parola con la selezione corrente */
export interface TokenAnalysis {
  word: string; // forma normalizzata (minuscola, senza diacritici)
  display: string; // forma da mostrare (maiuscola se l'originale era maiuscola)
  options: AnalysisOption[];
  selected: number;
  category: PosCategory;
  color: string;
  /** Voce verbale della forma selezionata (solo forme verbali): usata per
   *  sottolineare i passivi sia nell'app sia nel PDF. */
  voice?: "attivo" | "passivo";
  /** Numero grammaticale della forma selezionata (nomi, aggettivi, pronomi,
   *  verbi, participi). Nelle parole declinabili (nome, aggettivo, pronome,
   *  numerale — DECLINABILI) determina la SFUMATURA del colore: più chiara =
   *  singolare, più scura = plurale (shadeForNumber, app e PDF, come in
   *  legenda). Per verbi e invariabili resta nei dati per distinguere le
   *  opzioni con lo stesso caso (es. «currus»). Undefined per le
   *  invariabili (preposizioni, congiunzioni…). */
  number?: "singolare" | "plurale";
  label: string; // etichetta breve (es. "accusativo singolare")
  source: "whitaker" | "collatinus" | "manuale";
  /** Enclitica attaccata alla parola (es. TUTAMQUE = TUTAM + QUE): il CHIP
   *  resta interamente del colore del CASO della parola principale, ma le
   *  lettere dell'enclitica restano attaccate alla base: nero/bianco
   *  opposto nell'app; colore della categoria in legenda nel PDF.
   *  Impostata da applyRoleOverrides quando l'IA segnala la divisione. */
  suffisso?: { testo: string; colore: string };
}

/** Token (parola + punteggiatura attaccata) */
export interface TokenData {
  text: string; // token originale completo (es. "Marcus,")
  word: string; // solo la parola (es. "Marcus")
  trailing: string; // punteggiatura attaccata (es. ",")
  isPunct: boolean; // true se è solo punteggiatura
  analysis: TokenAnalysis | null;
}

export interface SentenceGroup {
  tokens: TokenData[];
}

export interface AnalyzeResponse {
  sentences: SentenceGroup[];
  unknownWords: string[];
  apiUsed: boolean;
  /** Come sono stati assegnati i colori: dall'IA o dalle regole grammaticali. */
  colorSource?: "ai" | "regole";
}

/* ---------------------------------------------------------------------
   Schema colori — identico a quello del PDF «Latino Facile»
   --------------------------------------------------------------------- */
export const CASE_COLORS: Record<CaseName, string> = {
  nominativo: "#E53935", // rosso
  genitivo: "#FFB300", // ambra
  dativo: "#00ACC1", // ciano
  accusativo: "#43A047", // verde
  vocativo: "#3949AB", // indaco
  ablativo: "#8E24AA", // viola
};

/** Altri modi: marrone cioccolato, famiglia diversa dai sei casi e dagli
 *  altri due modi. Fonte unica per analisi, legenda, palette manuale e PDF. */
export const OTHER_MOODS_COLOR = "#795548";

export const MOOD_COLORS: Record<MoodName, string> = {
  indicativo: "#EF6C00", // arancione (distinto dal rosso del nominativo)
  congiuntivo: "#AD1457", // magenta lampone (ben distinto dall'indaco del vocativo)
  imperativo: OTHER_MOODS_COLOR,
  infinito: OTHER_MOODS_COLOR,
  participio: OTHER_MOODS_COLOR,
  gerundio: OTHER_MOODS_COLOR,
  gerundivo: OTHER_MOODS_COLOR,
  supino: OTHER_MOODS_COLOR,
};

/** Parole di servizio: blu approvato per avverbi, due grigi molto diversi
 * per preposizioni/congiunzioni. Fonte unica per motore, IA, legenda e PDF.
 * Sul chip chiaro si usa testo scuro; nel PDF il grigio chiaro conserva
 * il riempimento e riceve un contorno scuro, non uno sfondo.
 * Casi (incluse sfumature di numero) e modi verbali non cambiano. */
export const SERVICE_COLORS = {
  avverbio: "#0057D9", // blu intenso
  preposizione: "#BDBDBD", // grigio chiaro
  congiunzione: "#4A4A4A", // grigio scuro
} as const;

/** Contorno di leggibilità per il solo nuovo grigio chiaro nel PDF. */
export const SERVICE_LIGHT_OUTLINE_COLOR = "#595959";

export function isLightServiceColor(hex: string): boolean {
  return hex.toUpperCase() === SERVICE_COLORS.preposizione;
}

/** Testo descrittivo della legenda: non schiarire ulteriormente i due
 * grigi. Il campione resta del colore esatto; la didascalia è leggibile. */
export function legendExplanationColor(hex: string): string {
  if (isLightServiceColor(hex)) return SERVICE_LIGHT_OUTLINE_COLOR;
  if (hex.toUpperCase() === SERVICE_COLORS.congiunzione) return SERVICE_COLORS.congiunzione;
  return lightenColor(hex);
}

/** Colore di categoria dell'enclitica nel PDF, sempre coerente con legenda.
 * Nell'app rimane l'inversione nero/bianco sulla base, NON questa tinta. */
export function colorForEnclitic(ending: string): string {
  return ending.toLowerCase() === "cum"
    ? SERVICE_COLORS.preposizione
    : SERVICE_COLORS.congiunzione;
}

export const POS_COLORS: Partial<Record<PosCategory, string>> = {
  ...SERVICE_COLORS,
  interiezione: "#757575", // grigio
  particella: "#757575", // grigio
  /* Parole NON riconosciute (nome/aggettivo/pronome senza caso, sconosciute
     a Whitaker e all'IA): chip NERO con scritta BIANCA (richiesta
     dell'utente 26/10g, prima bianco). Nel PDF (dove le lettere sono
     colorate senza sfondo) queste parole si disegnano con
     UNKNOWN_TEXT_COLOR (nero), perché lettere bianche su pagina bianca
     sarebbero invisibili: così la legenda «colore nero» è coerente. */
  sconosciuto: "#000000",
  punteggiatura: "#9E9E9E",
};

/** Colore della SCRIITTA per le parole non riconosciute (sfondo bianco):
 *  nero, sia nell'app (chip bianco) sia nel PDF (lettere). */
export const UNKNOWN_TEXT_COLOR = "#1a1a1a";

/** Colore per una categoria senza caso/modo specifico */
export function colorForCategory(pos: PosCategory): string | null {
  return POS_COLORS[pos] ?? null;
}

/** Etichetta italiana per un caso */
export const CASE_LABELS: Record<CaseName, string> = {
  nominativo: "nominativo",
  genitivo: "genitivo",
  dativo: "dativo",
  accusativo: "accusativo",
  vocativo: "vocativo",
  ablativo: "ablativo",
};

/** Ordine di visualizzazione della legenda. FONTE UNICA: la legenda
 *  dell'app e quella del PDF sono generate da questo stesso array,
 *  quindi restano sempre identiche.
 *  `compl` = testo esplicativo della voce: il complemento italiano
 *  corrispondente al caso/modo (es. SOGGETTO, PREDICATO VERBALE) oppure
 *  esempi esplicativi (es. PAROLE DI SERVIZIO con esempi ET = e, AD = a,
 *  NUNC = ora per avverbi, preposizioni e congiunzioni).
 *  `numero` = true per i CASI: l'etichetta diventa due voci, «CASO
 *  SINGOLARE» con la sfumatura chiara e «CASO PLURALE» con quella scura
 *  (colori con shadeForNumber, come i chip dell'app e le parole del PDF). */
export const LEGEND_ITEMS: {
  key: string;
  label: string;
  color: string;
  sub?: string;
  compl?: string;
  /** true per i casi: mostra anche la voce «... PLURALE» con la sfumatura scura */
  numero?: boolean;
}[] = [
  { key: "nominativo", label: "NOMINATIVO", numero: true, color: CASE_COLORS.nominativo, sub: "chi? che cosa?", compl: "SOGGETTO" },
  { key: "genitivo", label: "GENITIVO", numero: true, color: CASE_COLORS.genitivo, sub: "di chi? di che cosa?", compl: "COMPLEMENTO DI SPECIFICAZIONE" },
  { key: "dativo", label: "DATIVO", numero: true, color: CASE_COLORS.dativo, sub: "a chi? a che cosa?", compl: "COMPLEMENTO DI TERMINE" },
  { key: "accusativo", label: "ACCUSATIVO", numero: true, color: CASE_COLORS.accusativo, sub: "chi? che cosa? (subisce)", compl: "COMPLEMENTO OGGETTO" },
  { key: "vocativo", label: "VOCATIVO", numero: true, color: CASE_COLORS.vocativo, sub: "per chiamare", compl: "COMPLEMENTO DI VOCAZIONE" },
  { key: "ablativo", label: "ABLATIVO", numero: true, color: CASE_COLORS.ablativo, sub: "da, con, per, in...", compl: "MEZZO · MODO · CAUSA · LUOGO · TEMPO" },
  { key: "indicativo", label: "INDICATIVO", color: MOOD_COLORS.indicativo, sub: "fatti veri", compl: "PREDICATO VERBALE" },
  { key: "congiuntivo", label: "CONGIUNTIVO", color: MOOD_COLORS.congiuntivo, sub: "desideri e possibilità", compl: "PREDICATO VERBALE" },
  { key: "altri modi", label: "ALTRI MODI VERBALI", color: MOOD_COLORS.infinito, sub: "infinito, participio, gerundio, imperativo...", compl: "PREDICATO VERBALE" },
  { key: "avverbio", label: "AVVERBI", color: POS_COLORS.avverbio!, compl: "PAROLE DI SERVIZIO", sub: "NUNC = ora · IBI = lì · SEMPER = sempre" },
  { key: "preposizione", label: "PREPOSIZIONI", color: POS_COLORS.preposizione!, compl: "PAROLE DI SERVIZIO", sub: "AD = a · EX = da · IN = in" },
  { key: "congiunzione", label: "CONGIUNZIONI", color: POS_COLORS.congiunzione!, compl: "PAROLE DI SERVIZIO", sub: "ET = e · SED = ma · AUT = o" },
];

/** Nota della legenda sulla voce verbale: distingue ATTIVO e PASSIVO.
 *  Le parti con `underline: true` vengono mostrate SOTTOLINEATE — come i
 *  verbi passivi — sia nell'app sia nel PDF (fonte unica, legende identiche).
 *  La sottolineatura decorativa c'è SOLO nel segmento della voce PASSIVA:
 *  nel segmento della voce ATTIVA il testo resta normale, senza underline. */
export interface LegendNotePart {
  text: string;
  underline?: boolean;
  /** Colore del testo della parte (app e PDF). Assente = colore standard. */
  color?: string;
}

/** Rosso della nota di legenda: IL PREDICATO VERBALE SOTTOLINEATO = VOCE PASSIVA */
export const VOICE_PASSIVE_COLOR = "#C62828";
/** Verde della nota di legenda: IL PREDICATO VERBALE NON SOTTOLINEATO = VOCE ATTIVA */
export const VOICE_ACTIVE_COLOR = "#2E7D32";

export const LEGEND_VOICE_NOTE: LegendNotePart[] = [
  { text: "IL PREDICATO VERBALE ", color: VOICE_PASSIVE_COLOR },
  { text: "SOTTOLINEATO", underline: true, color: VOICE_PASSIVE_COLOR },
  { text: " = VOCE PASSIVA", color: VOICE_PASSIVE_COLOR },
  { text: " - " },
  { text: "IL PREDICATO VERBALE NON ", color: VOICE_ACTIVE_COLOR },
  { text: "SOTTOLINEATO", color: VOICE_ACTIVE_COLOR },
  { text: " = VOCE ATTIVA", color: VOICE_ACTIVE_COLOR },
];

/** Quanto la sfumatura del SINGOLARE si schiarisce (0-1, mescolando col
 *  bianco) e quanto quella del PLURALE si scurisce (0-1, mescolando col nero). */
export const SINGOLARE_LIGHTEN = 0.26;
export const PLURALE_DARKEN = 0.3;

/** Schiarisce un colore hex mescolandolo con il bianco
 *  (amount 0 = colore invariato, 1 = bianco puro).
 *  Usato per scrivere i complementi della legenda nella
 *  versione «chiara» del colore del proprio caso
 *  (es. SOGGETTO in rosso chiaro per il nominativo). */
export function lightenColor(hex: string, amount = 0.35): string {
  const h = hex.replace("#", "");
  const ch = (i: number) =>
    Math.round(
      parseInt(h.slice(i, i + 2), 16) + (255 - parseInt(h.slice(i, i + 2), 16)) * amount
    );
  return `#${[0, 2, 4].map((i) => ch(i).toString(16).padStart(2, "0")).join("")}`;
}

/** Scurisce un colore hex mescolandolo con il nero
 *  (amount 0 = colore invariato, 1 = nero puro). */
export function darkenColor(hex: string, amount = 0.3): string {
  const h = hex.replace("#", "");
  const ch = (i: number) =>
    Math.round(parseInt(h.slice(i, i + 2), 16) * (1 - amount));
  return `#${[0, 2, 4].map((i) => ch(i).toString(16).padStart(2, "0")).join("")}`;
}

/** Colore con la sfumatura del numero grammaticale: SINGOLARE = più CHIARO
 *  (mescolato col bianco), PLURALE = più SCURO (mescolato col nero), stesso
 *  colore di base. Senza numero restituisce il colore invariato.
 *  Usato per le parole declinabili (DECLINABILI) nei chips (Home.tsx), nel
 *  PDF (export.ts) e nelle voci SINGOLARE/PLURALE della legenda. */
export function shadeForNumber(
  hex: string,
  numero?: "singolare" | "plurale" | null
): string {
  if (numero === "singolare") return lightenColor(hex, SINGOLARE_LIGHTEN);
  if (numero === "plurale") return darkenColor(hex, PLURALE_DARKEN);
  return hex;
}

/** Parole declinabili: prendono il colore del CASO e la sfumatura del
 *  numero (chiaro = singolare, scuro = plurale), come in legenda. Verbi e
 *  parole invariabili restano del colore pieno. */
export const DECLINABILI: readonly PosCategory[] = [
  "nome",
  "aggettivo",
  "pronome",
  "numerale",
];

/** Numero da usare per la sfumatura del colore: valorizzato SOLO per le
 *  parole declinabili (DECLINABILI); null per verbi e invariabili. */
export function numeroPerSfumatura(
  category: PosCategory | undefined,
  numero?: "singolare" | "plurale" | null
): "singolare" | "plurale" | null {
  return category && DECLINABILI.includes(category) ? (numero ?? null) : null;
}
