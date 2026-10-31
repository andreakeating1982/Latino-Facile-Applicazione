/**
 * COLORAZIONE GUIDATA DALLA TRADUZIONE ITALIANA
 *
 * La colorazione di ogni parola latina deriva dal ruolo che la parola ha
 * nella TRADUZIONE ITALIANA mostrata all'alunno — non (solo) dall'analisi
 * morfologica, che può essere ambigua («Romae» può essere genitivo, dativo o
 * ablativo; «convivis» verbo o nome; «caris» dativo o ablativo). La
 * traduzione italiana è invece inequivocabile:
 *
 *   «le nostre valorose truppe»    → soggetto            → nominativo
 *   «offre», «tornano»             → verbo               → colore del verbo
 *   «dalla Germania e dall'Africa» → moto da luogo       → ablativo
 *   «con un ricco bottino»         → complemento         → ablativo
 *   «dagli abitanti»               → compl. d'agente     → ablativo
 *   «di Roma»                      → specificazione      → genitivo
 *   «ai suoi cari amici»           → compl. di termine   → dativo
 *   «sontuosi banchetti»           → compl. oggetto      → accusativo
 *   «in una splendida villa»       → stato in luogo      → ablativo
 *
 * Il modulo riceve i gruppi di frasi già analizzati (con TUTTE le opzioni
 * morfologiche) e le righe della traduzione italiana; per ogni parola latina
 * individua la parola italiana corrispondente (allineamento per traduzione di
 * dizionario O per radice/cognato: «caris»≈«cari», «splendida»≈«splendida»,
 * «portas»≈«porte») e le assegna il colore del ruolo che ha nella frase
 * italiana, selezionando l'opzione morfologica coerente.
 */

import type {
  AnalysisOption,
  CaseName,
  PosCategory,
  SentenceGroup,
  TokenData,
} from "../../shared/types";
import { colorForEnclitic } from "../../shared/types";
import { optionColor } from "./index";
import { italianVerbForms } from "./itTranslate";
import { parseWhitaker } from "./whitaker";

type ItRole =
  | "nominativo"
  | "genitivo"
  | "dativo"
  | "accusativo"
  | "ablativo"
  | "verbo"
  | "funzione"
  | "sconosciuto";

interface ItToken {
  w: string; // forma minuscola
  cap: boolean; // inizia con maiuscola (nome proprio?)
}

/* ------------------------------------------------------------------ */
/* Tokenizzazione della riga italiana                                  */
/* ------------------------------------------------------------------ */

const ARTICLES = new Set([
  "il", "lo", "la", "i", "gli", "le", "l'", "un", "uno", "una", "un'",
]);

const DEMONSTRATIVES = new Set([
  "questo", "questa", "questi", "queste", "quello", "quella", "quelli",
  "quelle", "quel", "quegli", "codesto", "codesta", "codesti", "codeste",
]);

/** Aggettivi possessivi italiani: di solito NON hanno un corrispondente
    latino nella frase («ai suoi cari amici» = «caris amicis») e non devono
    rubare un aggettivo latino nell'allineamento di ripiego. */
const POSSESSIVE_IT = new Set([
  "mio", "mia", "miei", "mie", "tuo", "tua", "tuoi", "tue",
  "suo", "sua", "suoi", "sue", "nostro", "nostra", "nostri", "nostre",
  "vostro", "vostra", "vostri", "vostre", "loro",
  "proprio", "propria", "propri", "proprie",
]);

/** Preposizioni italiane → caso latino del complemento che introducono. */
const PREP_CASE: Record<string, ItRole> = {
  "di": "genitivo", "del": "genitivo", "dello": "genitivo", "della": "genitivo",
  "dei": "genitivo", "degli": "genitivo", "delle": "genitivo", "dell'": "genitivo", "d'": "genitivo",
  "da": "ablativo", "dal": "ablativo", "dallo": "ablativo", "dalla": "ablativo",
  "dai": "ablativo", "dagli": "ablativo", "dalle": "ablativo", "dall'": "ablativo",
  "con": "ablativo", "col": "ablativo", "collo": "ablativo", "colla": "ablativo",
  "coi": "ablativo", "cogli": "ablativo", "colle": "ablativo", "coll'": "ablativo",
  "a": "dativo", "ad": "dativo", "al": "dativo", "allo": "dativo", "alla": "dativo",
  "ai": "dativo", "agli": "dativo", "alle": "dativo", "all'": "dativo",
  "in": "ablativo", "nel": "ablativo", "nello": "ablativo", "nella": "ablativo",
  "nei": "ablativo", "negli": "ablativo", "nelle": "ablativo", "nell'": "ablativo",
  "per": "ablativo", "pel": "ablativo",
  "su": "ablativo", "sul": "ablativo", "sullo": "ablativo", "sulla": "ablativo",
  "sui": "ablativo", "sugli": "ablativo", "sulle": "ablativo", "sull'": "ablativo",
  "tra": "ablativo", "fra": "ablativo",
  "verso": "accusativo",
};

/** Copula italiana: il nome che segue è predicato nominale (nominativo). */
const COPULA_IT = new Set([
  "è", "era", "ero", "erano", "eravamo", "eravate", "sei", "siamo", "siete",
  "sono", "sarò", "sarai", "sarà", "saremo", "sarete", "saranno", "fu", "fui",
  "fosti", "fummo", "foste", "furono",
]);

/** Ausiliari del passivo: il nome che segue è il soggetto (nominativo). */
const PASSIVE_AUX_IT = new Set([
  "viene", "vengono", "veniva", "venivano", "venne", "vennero", "venga", "vengano",
]);

/** Verbi italiani brevi che le desinenze non riconoscono (dà, fa, ha…). */
const VERB_SHORT_IT = new Set([
  "dà", "fa", "sta", "va", "può", "sa", "ha", "ho", "hai", "hanno",
  "fanno", "vanno", "stanno", "danno", "sanno", "possono", "vuole",
]);

/** Tutte le forme dei paradigmi irregolari italiani (essere, avere, dare,
    venire, vedere, andare, fare, dire, uscire, preferire…): coprono verbi
    che l'euristica sulle desinenze non riconosce («offre», «protegge»,
    «custodiscono»). */
const VERB_FORMS_IT = italianVerbForms();

/** Congiunzioni/avverbi italiani: parole-funzione (non influenzano i ruoli). */
const CONJ_IT = new Set([
  "e", "o", "ma", "né", "però", "quindi", "dunque", "cioè", "infatti",
  "anche", "poi", "tuttavia", "invece", "così", "dove", "quando", "perché",
  "se", "mentre", "che", "come", "allora", "dopo", "prima", "spesso",
  "sempre", "oggi", "ieri", "domani", "qui", "lì", "là", "molto",
  "troppo", "poco", "più", "meno", "non", "già", "quasi", "ancora", "mai",
]);

function tokenizeIt(line: string): ItToken[] {
  return line
    .replace(/([.,;:!?…])/g, " $1 ")
    .split(/\s+/)
    .filter(Boolean)
    .flatMap((raw) => {
      const lower = raw.toLowerCase();
      // elisioni: «dell'isola», «d'Italia», «nell'orto», «l'alba»… (il regex
      // prova prima le forme lunghe «dall», «dell», poi «d», «l»)
      const m = lower.match(/^(d|dall|dell|all|nell|sull|coll|un|quell|quest|l)'(.+)$/);
      if (m) {
        const prep = m[1] + "'";
        const rest = m[2];
        const restRaw = raw.slice(m[1].length + 1);
        return [
          { w: prep, cap: false },
          { w: rest, cap: /^[A-ZÀÈÉÌÒÙ]/.test(restRaw) },
        ];
      }
      return [{ w: lower, cap: /^[A-ZÀÈÉÌÒÙ]/.test(raw) }];
    });
}

/** Rilevamento euristico dei verbi italiani (migliorato dall'allineamento). */
function isVerbFormIt(tokens: ItToken[], i: number): boolean {
  const w = tokens[i].w;
  if (COPULA_IT.has(w) || PASSIVE_AUX_IT.has(w) || VERB_SHORT_IT.has(w)) return true;
  if (VERB_FORMS_IT.has(w)) return true;
  // dopo un articolo c'è quasi sempre un nome, non un verbo («le monete»)
  const prev = i > 0 ? tokens[i - 1].w : "";
  if (ARTICLES.has(prev) || DEMONSTRATIVES.has(prev)) return false;
  if (tokens[i].cap) return false; // nome proprio
  // participi passati: celebrati, tornata, lodato…
  if (w.length >= 5 && /(ato|ata|ati|ate|uto|uta|uti|ute|ito|ita|iti|ite)$/.test(w)) return true;
  // forme verbali riconoscibili: tornano, vedono, amiamo, amate, vedeva…
  if (w.length >= 5 && /(ano|ono|iamo|ate|ete|ite|ava|eva|iva|erà|irà)$/.test(w)) return true;
  // infiniti: tornare, celebrare, partire…
  if (w.length >= 5 && /(are|ere|ire)$/.test(w)) return true;
  // 3ª singolare presente (ama, adora, canta, crede…): un nome in un
  // complemento (dopo articolo/preposizione) o un nome proprio non lo è
  if (w.length >= 4 && /[aeo]$/.test(w) && !tokens[i].cap) {
    if (!ARTICLES.has(prev) && !DEMONSTRATIVES.has(prev) && !(prev in PREP_CASE)) {
      // dopo la copula la parola è il PREDICATO nominale, non un verbo:
      // «è sempre salda», «è bella» (ma non «venne lodato»: participio,
      // già intercettato dalle regole precedenti)
      let k = i - 1;
      while (
        k >= 0 &&
        (ARTICLES.has(tokens[k].w) ||
          DEMONSTRATIVES.has(tokens[k].w) ||
          CONJ_IT.has(tokens[k].w) ||
          tokens[k].w in PREP_CASE)
      )
        k--;
      if (k >= 0 && (COPULA_IT.has(tokens[k].w) || PASSIVE_AUX_IT.has(tokens[k].w))) {
        return false;
      }
      return true;
    }
  }
  return false;
}

/** Segnali FORTI di verbo italiano (copula, forme irregolari, participi,
    desinenze tipiche, infiniti): escludono il declassamento dell'euristica
    debole («custodiscono», «tornano», «adora» restano verbi). */
function isStrongVerbIt(tokens: ItToken[], i: number): boolean {
  const w = tokens[i].w;
  if (COPULA_IT.has(w) || PASSIVE_AUX_IT.has(w) || VERB_SHORT_IT.has(w)) return true;
  if (VERB_FORMS_IT.has(w)) return true;
  if (w.length >= 5 && /(ato|ata|ati|ate|uto|uta|uti|ute|ito|ita|iti|ite)$/.test(w)) return true;
  if (w.length >= 5 && /(ano|ono|iamo|ate|ete|ite|ava|eva|iva|erà|irà)$/.test(w)) return true;
  if (w.length >= 5 && /(are|ere|ire)$/.test(w)) return true;
  return false;
}

/* ------------------------------------------------------------------ */
/* Ruoli italiani                                                      */
/* ------------------------------------------------------------------ */

/** Passata 1: marca verbi, parole-funzione e punteggiatura. */
function markVerbsAndFunction(tokens: ItToken[]): (ItRole | undefined)[] {
  const roles: (ItRole | undefined)[] = new Array(tokens.length).fill(undefined);
  for (let i = 0; i < tokens.length; i++) {
    const w = tokens[i].w;
    if (/^[.,;:!?…]$/.test(w)) { roles[i] = "funzione"; continue; }
    // parole-funzione PRIMA dell'euristica dei verbi: le preposizioni
    // articolate («dalla», «della», «dai»…) somigliano a forme verbali
    // («dai» = tu dai) ma in una traduzione sono preposizioni
    if (ARTICLES.has(w) || DEMONSTRATIVES.has(w) || CONJ_IT.has(w)) { roles[i] = "funzione"; continue; }
    if (w in PREP_CASE) { roles[i] = "funzione"; continue; }
    if (isVerbFormIt(tokens, i)) { roles[i] = "verbo"; continue; }
  }
  return roles;
}

/**
 * Passata 2: complementi (preposizioni), soggetto e oggetto.
 *
 * Il complemento introdotto da una preposizione («ai suoi cari amici»,
 * «in una splendida villa», «con un ricco bottino») si estende a TUTTA la
 * frase nominale: possessivo + aggettivi + nome. Il caso pendente resta
 * attivo finché non arriva un verbo o un'altra preposizione.
 */
function assignRoles(tokens: ItToken[], roles: (ItRole | undefined)[]): (ItRole | undefined)[] {
  const verbIdxs: number[] = [];
  for (let i = 0; i < roles.length; i++) if (roles[i] === "verbo") verbIdxs.push(i);
  const firstVerb = verbIdxs.length > 0 ? verbIdxs[0] : -1;
  const lastVerb = verbIdxs.length > 0 ? verbIdxs[verbIdxs.length - 1] : -1;

  let pending: ItRole | null = null;
  let copulaAfter = false;
  for (let i = 0; i < tokens.length; i++) {
    if (roles[i] === "verbo") {
      pending = null;
      if (COPULA_IT.has(tokens[i].w) || PASSIVE_AUX_IT.has(tokens[i].w)) copulaAfter = true;
      continue;
    }
    if (roles[i] === "funzione") {
      const pc = PREP_CASE[tokens[i].w];
      if (pc !== undefined) {
        pending = pc;
        copulaAfter = false;
        // «a Roma» (nome proprio) = moto a luogo → accusativo, non dativo
        if (pc === "dativo") {
          let k = i + 1;
          while (k < tokens.length && roles[k] === "funzione") k++;
          if (k < tokens.length && tokens[k].cap) pending = "accusativo";
        }
      }
      continue;
    }
    // parola di contenuto
    if (pending) {
      roles[i] = pending;
      copulaAfter = false;
      // il complemento prosegue sull'intera frase nominale: il caso pendente
      // NON si azzera (si fermerà al prossimo verbo o alla prossima preposizione)
      continue;
    }
    if (firstVerb < 0 || i < firstVerb) {
      roles[i] = "nominativo"; // soggetto (o frase senza verbo: predicato nominale)
      continue;
    }
    if (i > lastVerb && copulaAfter) {
      roles[i] = "nominativo"; // predicato nominale / soggetto del passivo
      copulaAfter = false;
      continue;
    }
    roles[i] = "accusativo"; // complemento oggetto
  }
  return roles;
}

/* ------------------------------------------------------------------ */
/* Allineamento latino → italiano                                      */
/* ------------------------------------------------------------------ */

const NOMINAL_POS = ["nome", "aggettivo", "pronome", "numerale"];

/** Preposizioni latine più comuni: un nome che le segue è retto da esse e
 *  non può mai essere vocativo (usato dalla guardia vocativo). */
/** Forme imperative della COPULA essere: il PRIMO nome che le segue è il
 *  PREDICATO DEL NOMINATIVO («Este viri» = «siate uomini»), non la chiamata
 *  (usato dalla guardia vocativo). */
const COPULA_IMP_FORMS = new Set(["es", "este", "esto", "estote"]);

const PREP_FORMS = new Set([
  "a", "ab", "abs", "ad", "adversus", "adversum", "ante", "apud", "circum",
  "circiter", "cis", "citra", "contra", "cum", "de", "e", "ex", "extra",
  "in", "intra", "iuxta", "ob", "per", "post", "praeter", "pro", "prope",
  "propter", "secundum", "sine", "sub", "super", "trans", "ultra", "versus",
]);
const FUNCTION_POS = ["preposizione", "congiunzione", "avverbio", "interiezione", "particella"];

/** Parole italiane candidate dalla traduzione di un'opzione latina. */
function translationStems(o: AnalysisOption): string[] {
  const raw = (o.translation ?? "").toLowerCase();
  const stems = new Set<string>();
  for (const chunk of raw.split(/[;,/]+/)) {
    for (const w of chunk.split(/\s+/)) {
      // prima l'articolo, poi l'apostrofo: «l'alba» → «alba» (non «lba»)
      let ww = w.replace(/^(il|lo|la|i|gli|le|l'|un|uno|una|un')\s*/, "");
      ww = ww.replace(/[’'’]/g, "").replace(/\\([^)]*\\)/g, "");
      if (ww.length >= 3) stems.add(ww);
    }
  }
  return [...stems];
}

/** Normalizza gli accenti («dà» → «da», «è» → «e»). */
function normIt(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/** Confronto di radice: «amare»≈«ama», «dà»≈«dare», «truppe»≈«truppe». */
function stemMatch(a: string, b: string): boolean {
  a = normIt(a);
  b = normIt(b);
  if (a === b) return true;
  if (a.length < 2 || b.length < 2) return false;
  const shorter = a.length <= b.length ? a : b;
  const longer = a.length <= b.length ? b : a;
  if (longer.startsWith(shorter)) return true; // «dà» ⊂ «dare», «ama» ⊂ «amare»
  let i = 0;
  const max = Math.min(a.length, b.length);
  while (i < max && a[i] === b[i]) i++;
  return i >= 4 && i >= max - 3;
}

/** Radice di una forma verbale italiana («custodiscono»→«custodisc»,
    «offrire»→«offri»): serve a confrontare forme coniugate con infiniti. */
function verbStem(s: string): string {
  s = normIt(s);
  const sufs = ["iscono", "iamo", "ate", "ete", "ite", "ano", "ono", "are", "ere", "ire", "re", "no", "te", "a", "e", "o", "i"];
  for (const suf of sufs) {
    if (s.length > suf.length + 2 && s.endsWith(suf)) {
      const stem = s.slice(0, s.length - suf.length);
      if (stem.length >= 2) return stem;
      break;
    }
  }
  return s;
}

/** Forme della parola latina senza desinenze di caso («romae»→«rom»). */
function latinStemForms(w: string): string[] {
  const out: string[] = [];
  for (const suf of ["ibus", "arum", "orum", "ae", "is", "am", "um", "os", "em", "as", "es", "e", "i", "a", "o"]) {
    if (w.length > suf.length + 2 && w.endsWith(suf)) out.push(w.slice(0, w.length - suf.length));
  }
  return out;
}

/** Allineamento per radice: «caris»≈«cari», «romae»≈«Roma», «portas»≈«porte»,
    ma NON «Vigiliarum»≈«vigilanza» (radici diverse dopo la desinenza). */
function cognateMatch(latinWord: string, itWord: string): boolean {
  const lw = normIt(latinWord.toLowerCase());
  const iw = normIt(itWord);
  if (stemMatch(lw, iw)) return true;
  for (const st of latinStemForms(lw)) {
    if (st.length >= 4 && (iw.startsWith(st) || st.startsWith(iw))) return true;
  }
  return false;
}

/** Indici dei token latini di contenuto (nominali o verbo). */
function latinContentIdx(group: SentenceGroup): number[] {
  const idxs: number[] = [];
  for (let i = 0; i < group.tokens.length; i++) {
    const t = group.tokens[i];
    if (t.isPunct || !t.analysis) continue;
    const sel = t.analysis.options[t.analysis.selected];
    if (FUNCTION_POS.includes(sel.pos)) continue;
    // un «verbo» che in italiano è un nome (es. convivis) deve poter essere
    // allineato alla parola italiana: includi chi ha opzioni nominali
    const hasNominal = t.analysis.options.some((o) => NOMINAL_POS.includes(o.pos));
    if (hasNominal || sel.pos === "verbo") idxs.push(i);
  }
  return idxs;
}

function isFiniteVerbLike(o: AnalysisOption): boolean {
  return (
    o.pos === "verbo" &&
    o.mood != null &&
    ["indicativo", "congiuntivo", "imperativo"].includes(o.mood)
  );
}

function alignLatinIt(
  group: SentenceGroup,
  itTokens: ItToken[],
  roles: (ItRole | undefined)[]
): Map<number, number> {
  const align = new Map<number, number>();
  const latinIdxs = latinContentIdx(group);
  const used = new Set<number>();

  // passata 1a: per ogni parola italiana di contenuto (in ordine) trova il
  // primo token latino non ancora allineato la cui TRADUZIONE DI DIZIONARIO
  // combacia (glossario Whitaker/italiano o forme coniugate vs infiniti).
  // Il dizionario ha la precedenza sul cognato: «alba» (soggetto) deve
  // agganciarsi ad «aurora» (il cui glossario dice «l'alba»), non
  // all'aggettivo latino «alba» solo perché si scrive uguale.
  for (let j = 0; j < itTokens.length; j++) {
    const role = roles[j];
    if (role === "funzione" || role === "sconosciuto") continue;
    const itW = itTokens[j].w;
    let best: number | null = null;
    for (const li of latinIdxs) {
      if (used.has(li)) continue;
      const t = group.tokens[li];
      const opts = t.analysis!.options;
      const hasVerb = opts.some((o) => o.pos === "verbo");
      // un ruolo «verbo» italiano va allineato a un verbo latino, non a un nome
      if (role === "verbo" && !hasVerb) continue;
      const stems = opts.flatMap(translationStems);
      let match = stems.some((s) => stemMatch(itW, s));
      // forme coniugate vs infiniti: «custodiscono»≈«custodire», «offre»≈«offrire»
      if (hasVerb) match = match || stems.some((s) => stemMatch(verbStem(itW), verbStem(s)));
      if (match) {
        best = li;
        break;
      }
    }
    // passata 1b: solo se il dizionario non ha aiutato, prova il cognato
    // (stessa radice: «caris»≈«cari», «portas»≈«porte»)
    if (best === null) {
      for (const li of latinIdxs) {
        if (used.has(li)) continue;
        const t = group.tokens[li];
        const opts = t.analysis!.options;
        const hasVerb = opts.some((o) => o.pos === "verbo");
        if (role === "verbo" && !hasVerb) continue;
        if (cognateMatch(t.word.toLowerCase(), itW)) {
          best = li;
          break;
        }
      }
    }
    if (best !== null) {
      align.set(best, j);
      used.add(best);
    }
  }

  return align;
}

/**
 * Passata 2: parole italiane di contenuto senza corrispondenza (es. «ricco»
 * per «magna» = grande, «salda» per «firma») → primo nominale latino
 * rimasto, in ordine (nomi E aggettivi: «forze»→copiarum, «salda»→firma).
 * I possessivi italiani («suoi») non rubano parole: di solito non hanno un
 * corrispondente latino nella frase. Deve girare DOPO il declassamento dei
 * falsi verbi, così «romane», «valorose»… (declassate a contenuto) possono
 * agganciarsi alla parola italiana giusta.
 */
function alignLatinItPass2(
  group: SentenceGroup,
  itTokens: ItToken[],
  roles: (ItRole | undefined)[],
  align: Map<number, number>
): void {
  const latinIdxs = latinContentIdx(group);
  const used = new Set<number>(align.keys());
  for (let j = 0; j < itTokens.length; j++) {
    if (roles[j] === "funzione" || roles[j] === "sconosciuto" || roles[j] === "verbo") continue;
    if (POSSESSIVE_IT.has(itTokens[j].w)) continue;
    let already = false;
    for (const [, v] of align) if (v === j) { already = true; break; }
    if (already) continue;
    for (const li of latinIdxs) {
      if (used.has(li)) continue;
      const t = group.tokens[li];
      const sel = t.analysis!.options[t.analysis!.selected];
      if (NOMINAL_POS.includes(sel.pos)) {
        align.set(li, j);
        used.add(li);
        break;
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/* Sintesi delle opzioni mancanti                                      */
/* ------------------------------------------------------------------ */

/**
 * Completa il paradigma quando Whitaker non ha generato il caso richiesto
 * dalla traduzione italiana (es. «incolae» senza il nominativo plurale): se
 * la desinenza rende il caso MORFOLOGICAMENTE CERTO (1ª decl -ae → NOM P,
 * 2ª decl -i → NOM P, -am/-um/-em → ACC S, -as/-os/-es → ACC P…),
 * sintetizza un'opzione coerente così il colore può seguire la traduzione.
 * L'opzione sintetica NON inventa nulla: esprime un caso che la forma
 * flessa già contiene, ma che il dizionario non ha elencato.
 */
function synthOption(t: TokenData, role: ItRole): AnalysisOption | null {
  const a = t.analysis!;
  const opts = a.options;
  const w = a.word;
  const genS = opts.find(
    (o) =>
      NOMINAL_POS.includes(o.pos) &&
      o.case === "genitivo" &&
      o.number === "singolare"
  );
  if (!genS) return null;
  const g = (x?: string): "maschile" | "femminile" | undefined =>
    x && x !== "-" ? (x as "maschile" | "femminile") : undefined;
  // a runtime Whitaker può dare gender "-" (ignoto): non è nel tipo TS
  const gRaw = genS.gender as string | undefined;
  const femm1 = !gRaw || gRaw === "femminile" || gRaw === "-";
  const masch2 = gRaw === "maschile";

  let o: Pick<AnalysisOption, "case" | "number" | "gender"> | null = null;
  if (role === "nominativo") {
    if (w.endsWith("ae") && femm1)
      o = { case: "nominativo", number: "plurale", gender: g(genS.gender) };
    else if (w.endsWith("i") && masch2)
      o = { case: "nominativo", number: "plurale", gender: "maschile" };
    else if (w.endsWith("es") && genS.gender !== "neutro")
      o = { case: "nominativo", number: "plurale", gender: g(genS.gender) };
  } else if (role === "accusativo") {
    if (w.endsWith("am") && femm1) o = { case: "accusativo", number: "singolare", gender: "femminile" };
    else if (w.endsWith("um") && masch2) o = { case: "accusativo", number: "singolare", gender: "maschile" };
    else if (w.endsWith("em") && genS.gender !== "neutro")
      o = { case: "accusativo", number: "singolare", gender: g(genS.gender) };
    else if (w.endsWith("as") && femm1) o = { case: "accusativo", number: "plurale", gender: "femminile" };
    else if (w.endsWith("os") && masch2) o = { case: "accusativo", number: "plurale", gender: "maschile" };
    else if (w.endsWith("es") && genS.gender !== "neutro")
      o = { case: "accusativo", number: "plurale", gender: g(genS.gender) };
  } else if (role === "ablativo") {
    if (
      w.endsWith("a") &&
      opts.some(
        (x) => NOMINAL_POS.includes(x.pos) && x.case === "nominativo" && x.gender === "femminile"
      )
    )
      o = { case: "ablativo", number: "singolare", gender: "femminile" };
    else if (
      w.endsWith("o") &&
      opts.some(
        (x) => NOMINAL_POS.includes(x.pos) && x.case === "nominativo" && x.gender === "maschile"
      )
    )
      o = { case: "ablativo", number: "singolare", gender: "maschile" };
  } else if (role === "dativo") {
    if (w.endsWith("ae") && femm1)
      o = { case: "dativo", number: "singolare", gender: g(genS.gender) };
  }
  if (!o) return null;
  const genderTxt = o.gender ? ` ${o.gender}` : "";
  return {
    lemma: genS.lemma,
    summary: genS.summary,
    translation: genS.translation,
    form: w,
    pos: genS.pos,
    case: o.case,
    number: o.number,
    gender: o.gender,
    freq: 1,
    desc: `${o.case}${genderTxt} ${o.number}`,
    raw: genS.raw,
  };
}

/* ------------------------------------------------------------------ */
/* Applicazione: ricolorazione dei token                               */
/* ------------------------------------------------------------------ */

/**
 * Applica la colorazione guidata dalla traduzione italiana ai gruppi di
 * frasi (mutandoli in-place, come fa il resto dell'analizzatore) e li
 * restituisce. `lines[i]` è la traduzione italiana del gruppo i.
 */
export function applyTranslationAnalysis(
  sentences: SentenceGroup[],
  lines: string[]
): SentenceGroup[] {
  if (!lines || lines.length === 0) return sentences;
  for (let si = 0; si < sentences.length; si++) {
    const group = sentences[si];
    const line = lines[si];
    if (!group || !group.tokens || !line) continue;
    const itTokens = tokenizeIt(line);
    if (itTokens.length === 0) continue;

    const roles0 = markVerbsAndFunction(itTokens);
    const align = alignLatinIt(group, itTokens, roles0);

    // Declassamento: i verbi italiani marcati SOLO dall'euristica debole
    // (3ª singolare in -a/-e/-o: «romane», «salda») che NON hanno trovato
    // un verbo latino da allineare sono probabilmente aggettivi/nomi
    // scambiati per verbi. Declassarli a parole di contenuto permette alla
    // passata 2 di agganciarli alla parola italiana giusta («salda»→firma).
    for (let j = 0; j < itTokens.length; j++) {
      if (roles0[j] !== "verbo") continue;
      if (isStrongVerbIt(itTokens, j)) continue;
      let alignedToVerb = false;
      for (const [li, ji] of align) {
        if (ji !== j) continue;
        const o = group.tokens[li].analysis?.options[group.tokens[li].analysis.selected];
        if (o?.pos === "verbo") {
          alignedToVerb = true;
          break;
        }
      }
      if (!alignedToVerb) roles0[j] = undefined;
    }
    // passata 2 di allineamento: aggancia le parole di contenuto rimaste
    // («salda»→firma, «forze»→copiarum, «valorose»→strenuae) usando i
    // ruoli già declassati
    alignLatinItPass2(group, itTokens, roles0, align);

    // i verbi latini confermano i verbi italiani anche quando l'euristica
    // non li riconosce («Puella rosam amat» → «ama»; «Terentia … praebet»
    // → «offre»): ricalcola i ruoli
    for (const [li, ji] of align) {
      const t = group.tokens[li];
      if (!t.analysis) continue;
      if (t.analysis.options[t.analysis.selected].pos === "verbo") {
        roles0[ji] = "verbo";
      }
    }

    // rete di sicurezza: se i verbi italiani riconosciuti sono MENO dei
    // verbi finiti latini, qualche verbo italiano non è stato individuato
    // («custodiscono», «protegge»): promuovi le prime parole di contenuto
    // non allineate e non protette (dopo articolo/preposizione, possessivi,
    // nomi propri)
    const latinVerbCount = group.tokens.filter(
      (t) =>
        !t.isPunct &&
        t.analysis != null &&
        isFiniteVerbLike(t.analysis.options[t.analysis.selected])
    ).length;
    const itVerbCount = roles0.filter((r) => r === "verbo").length;
    if (itVerbCount < latinVerbCount) {
      let need = latinVerbCount - itVerbCount;
      for (let j = 0; j < itTokens.length && need > 0; j++) {
        if (roles0[j] !== undefined) continue;
        if (POSSESSIVE_IT.has(itTokens[j].w)) continue;
        if (itTokens[j].cap) continue;
        const prev = j > 0 ? itTokens[j - 1].w : "";
        if (ARTICLES.has(prev) || DEMONSTRATIVES.has(prev) || prev in PREP_CASE) continue;
        let aligned = false;
        for (const [, ji] of align) if (ji === j) { aligned = true; break; }
        if (aligned) continue;
        roles0[j] = "verbo";
        need--;
      }
    }

    const roles = assignRoles(itTokens, roles0);

    // 1) ruolo di ogni token latino
    const latinRoles = new Map<number, ItRole>();
    for (let i = 0; i < group.tokens.length; i++) {
      const t = group.tokens[i];
      if (t.isPunct || !t.analysis) continue;
      const sel = t.analysis.options[t.analysis.selected];
      if (FUNCTION_POS.includes(sel.pos)) continue; // funzione: colore morfologico
      const itIdx = align.get(i);
      const itRole = itIdx !== undefined ? roles[itIdx] : undefined;
      if (itRole === "verbo") { latinRoles.set(i, "verbo"); continue; }
      if (itRole && itRole !== "funzione" && itRole !== "sconosciuto") {
        latinRoles.set(i, itRole);
        continue;
      }
      // nessun ruolo dalla traduzione: la colorazione si basa ESCLUSIVAMENTE
      // sulla traduzione italiana, quindi niente fallback morfologico. La
      // parola resta com'è (o eredita il ruolo dal nome testa, passata 3).
    }

    // 2) aggettivi senza ruolo: ereditano dal nome testa successivo
    for (let i = 0; i < group.tokens.length; i++) {
      const t = group.tokens[i];
      if (t.isPunct || !t.analysis || latinRoles.has(i)) continue;
      const sel = t.analysis.options[t.analysis.selected];
      if (sel.pos !== "aggettivo") continue;
      for (let j = i + 1; j < group.tokens.length; j++) {
        const tj = group.tokens[j];
        if (tj.isPunct || !tj.analysis) continue;
        const sj = tj.analysis.options[tj.analysis.selected];
        if (NOMINAL_POS.includes(sj.pos)) {
          const r = latinRoles.get(j);
          if (r) latinRoles.set(i, r);
          break;
        }
        if (sj.pos === "verbo") break;
      }
    }

    // 3) applica: seleziona l'opzione coerente con il ruolo e ricolora
    for (let i = 0; i < group.tokens.length; i++) {
      const t = group.tokens[i];
      if (t.isPunct || !t.analysis) continue;
      const role = latinRoles.get(i);
      if (!role || role === "verbo" || role === "funzione" || role === "sconosciuto") continue;
      let wanted = t.analysis.options.find(
        (o) => NOMINAL_POS.includes(o.pos) && o.case === role
      );
      // Whitaker a volte non genera il caso che la traduzione richiede
      // (es. «incolae» senza nominativo plurale): se la desinenza lo rende
      // morfologicamente certo, completa il paradigma con un'opzione
      // sintetica così il colore segue comunque la traduzione italiana.
      if (!wanted) {
        const synth = synthOption(t, role);
        if (synth) {
          t.analysis.options.push(synth);
          wanted = synth;
        }
      }
      if (!wanted) continue;
      const idx = t.analysis.options.indexOf(wanted);
      t.analysis.selected = idx;
      t.analysis.category = wanted.pos;
      t.analysis.color = optionColor(wanted);
      t.analysis.voice = wanted.voice;
      t.analysis.number = wanted.number;
      t.analysis.label = wanted.desc;
    }
  }
  return sentences;
}

/**
 * Applica i ruoli verificati dall'IA (parola latina → caso) come correzione
 * finale della colorazione: completa i casi che l'allineamento automatico non
 * può risolvere (es. «incolae» senza il nominativo plurale in Whitaker, o un
 * genitivo che la traduzione automatica ha trasformato in aggettivo). I ruoli
 * non validi vengono ignorati.
 */
/** Desinenze delle enclitiche per tipo (il suffisso mostrato col PROPRIO
 *  colore è la parte finale della parola: TUTAM|QUE, NOBIS|CUM…). */
const ENCLITIC_ENDINGS: Record<string, string[]> = {
  congiunzione: ["que", "ve", "ne"],
  particella: ["que", "ve", "ne"],
  preposizione: ["cum"],
};

/** Parole LATINE INTERE che finiscono come un'enclitica ma NON vanno
 *  divise (atque = «e», neque, itaque, denique, quoque…). */
const NON_ENCLITICHE = new Set([
  "atque", "neque", "itaque", "denique", "quoque", "utique", "aeque",
  "uterque", "quinque", "usque", "torque", "quisque", "ubique", "undique",
  "nonne", "quicumque", "quandoque",
]);

/** Pronomi + -cum (la base è sempre un ablativo): lista chiusa. */
const PRONOMI_CUM = new Set([
  "mecum", "tecum", "secum", "nobiscum", "vobiscum", "quocum", "quacum",
  "quibuscum",
]);

export interface EndingGuess {
  caso: CaseName;
  numero: "singolare" | "plurale";
  /** enclitica trovata attaccata alla base (es. «que» in TOTIDEMQUE) */
  suffix?: string;
}

/** Regole DESINENZA → caso+numero per le parole che NÉ Whitaker né l'IA
 *  riconoscono (richiesta dell'utente 26/10: PIRATARUM, MINOTAURUM,
 *  TOTIDEMQUE…). Ordine IMPORTANTE: i suffissi più lunghi prima. */
const ENDING_RULES: [RegExp, { caso: CaseName; numero: "singolare" | "plurale" }][] = [
  [/(arum|orum)$/, { caso: "genitivo", numero: "plurale" }],
  [/ibus$/, { caso: "ablativo", numero: "plurale" }],
  [/(os|as|es)$/, { caso: "accusativo", numero: "plurale" }],
  [/(um|am|em)$/, { caso: "accusativo", numero: "singolare" }],
  [/us$/, { caso: "nominativo", numero: "singolare" }],
  [/(ae|is|ei|i)$/, { caso: "genitivo", numero: "singolare" }],
  [/o$/, { caso: "ablativo", numero: "singolare" }],
  [/e$/, { caso: "ablativo", numero: "singolare" }],
  [/a$/, { caso: "nominativo", numero: "singolare" }],
];

/** Indovina CASO e NUMERO di una parola sconosciuta dalla DESINENZA finale
 *  (fallback quando né il dizionario né l'IA la conoscono). Se la parola è
 *  una BASE + enclitica (TOTIDEMQUE = TOTIDEM + QUE), l'enclitica viene
 *  separata e il caso si deduce dalla BASE. Restituisce null se la parola
 *  è troppo corta o non ha nessuna desinenza riconoscibile. */
export function guessFromEnding(word: string): EndingGuess | null {
  const w = word.toLowerCase();
  if (w.length < 3) return null;
  // enclitica attaccata: si analizza la BASE (TOTIDEMQUE → TOTIDEM + que)
  const encl = (["que", "ve", "ne", "cum"] as const).find(
    (e) => w.endsWith(e) && w.length > e.length + 3 && !NON_ENCLITICHE.has(w)
  );
  const stem = encl ? w.slice(0, -encl.length) : w;
  if (stem.length < 3) return null;
  for (const [re, g] of ENDING_RULES) {
    if (re.test(stem)) return { ...g, ...(encl ? { suffix: encl } : {}) };
  }
  // nessuna desinenza nota, ma c'è un'enclitica: la base si tratta come
  // accusativo singolare (la scelta più probabile per una parola attaccata)
  return encl ? { caso: "accusativo", numero: "singolare", suffix: encl } : null;
}

/* ------------------------------------------------------------------ */
/* GUARDIA VOCATIVO (26/10, richiesta utente: «Este viri filii… tolerate») */
/* ------------------------------------------------------------------ */

/**
 * In una frase di PURA ESORTAZIONE (c'è un verbo all'imperativo e nessun
 * verbo finito all'indicativo o al congiuntivo) un nome flessibile marcato
 * «nominativo» (dall'IA, dalle regole o dal default di Whitaker) è in
 * realtà la CHIAMATA: viene corretto in «vocativo». Dopo un imperativo non
 * esiste un soggetto al nominativo, quindi la correzione non può cancellare
 * un vero soggetto. La scansione usa TUTTE le opzioni di Whitaker, non
 * quella preselezionata (es. «tolerate» può risultare preselezionato come
 * participio). Se Whitaker non dichiara il vocativo per la forma (es.
 * «viri», «filii»: solo nominativo/genitivo), l'opzione viene sintetizzata
 * clonando quella del nominativo — al plurale la forma è identica.
 *
 * Scrive in `mergedRoles` i ruoli corretti (chiamata PRIMA del ciclo di
 * applicazione dei ruoli; sicura da richiamare più volte).
 */
export function applyVocativoGuard(
  sentences: SentenceGroup[],
  mergedRoles: Record<string, string>,
  numbers?: Record<string, string>
): void {
  for (const group of sentences) {
    const verbTokens = group.tokens.filter(
      (t) => !t.isPunct && t.analysis && t.analysis.category === "verbo"
    );
    const isImp = (o: AnalysisOption) =>
      o.mood === "imperativo" ||
      (o.desc ?? "").toLowerCase().startsWith("imperativo");
    const allImperative =
      verbTokens.length > 0 &&
      verbTokens.some((t) =>
        t.analysis!.options.some((o) => o.pos === "verbo" && isImp(o))
      ) &&
      !verbTokens.some((t) =>
        t.analysis!.options.some(
          (o) =>
            o.pos === "verbo" &&
            (o.mood === "indicativo" || o.mood === "congiuntivo")
        )
      );
    if (!allImperative) continue;
    // COPULA ALL'IMPERATIVO (este, estote, esto, es): il PRIMO nome che la
    // segue è il PREDICATO DEL NOMINATIVO («Este viri» = «siate uomini», non
    // la chiamata) e NON va convertito in vocativo; solo i nomi successivi
    // possono essere la chiamata (filii → vocativo)
    const copulaIdx = new Set<number>();
    group.tokens.forEach((ct, ci) => {
      if (ct.isPunct || !ct.analysis || ct.analysis.category !== "verbo")
        return;
      const hasImp = ct.analysis.options.some(
        (o) => o.pos === "verbo" && isImp(o)
      );
      if (hasImp && COPULA_IMP_FORMS.has(ct.word.toLowerCase()))
        copulaIdx.add(ci);
    });
    // un nome che segue una preposizione è retto da essa (cum patientia,
    // a viris…): non può MAI essere vocativo (in latino il vocativo non
    // è mai retto da preposizione)
    let prev: TokenData | null = null;
    for (let ti = 0; ti < group.tokens.length; ti++) {
      const t = group.tokens[ti];
      if (t.isPunct || !t.analysis) continue;
      if (!NOMINAL_POS.includes(t.analysis.category)) {
        prev = t;
        continue;
      }
      const prevPrep =
        prev?.analysis &&
        (prev.analysis.category === "preposizione" ||
          PREP_FORMS.has(prev.word.toLowerCase()));
      // predicato della copula: il nome subito dopo este/estote/esto/es
      // resta nominativo («Este viri» → viri = predicato, NON vocativo)
      let pj = ti - 1;
      while (pj >= 0 && group.tokens[pj].isPunct) pj--;
      if (pj >= 0 && copulaIdx.has(pj)) {
        prev = t;
        continue;
      }
      const w = t.word.toLowerCase();
      const cur = mergedRoles[w];
      // Interviene su «nominativo», su assenza di ruolo e anche su «vocativo»
      // già assegnato dall'IA: in quest'ultimo caso Whitaker spesso NON
      // dichiara l'opzione vocativo per la forma (viri, filii → solo
      // nominativo/genitivo) e senza sintesi il ruolo non verrebbe mai
      // applicato, lasciando l'etichetta di default «nominativo». Mai su
      // genitivo, accusativo, ablativo… già assegnati correttamente.
      if (cur && cur !== "nominativo" && cur !== "vocativo") continue;
      const num = numbers?.[w];
      if (prevPrep) {
        prev = t;
        continue;
      }
      const voc =
        t.analysis.options.find(
          (o) =>
            NOMINAL_POS.includes(o.pos) &&
            o.case === "vocativo" &&
            (!num || o.number === num)
        ) ??
        t.analysis.options.find(
          (o) => NOMINAL_POS.includes(o.pos) && o.case === "vocativo"
        );
      if (voc) {
        mergedRoles[w] = "vocativo";
        continue;
      }
      const nom = t.analysis.options.find(
        (o) =>
          NOMINAL_POS.includes(o.pos) &&
          o.case === "nominativo" &&
          (!num || o.number === num)
      );
      if (nom) {
        const synth: AnalysisOption = {
          ...nom,
          case: "vocativo",
          desc: nom.desc.replace(/^nominativo/, "vocativo"),
        };
        t.analysis.options.push(synth);
        mergedRoles[w] = "vocativo";
      }
      prev = t;
    }
  }
}

export function applyRoleOverrides(
  sentences: SentenceGroup[],
  roles: Record<string, string>,
  numbers?: Record<string, string>,
  /** Parole base + enclitica segnalate dall'IA (es. tutamque = tutam + que):
   *  il chip prende il colore del CASO della BASE e le lettere dell'enclitica
   *  nel PDF usano il colore della categoria, sempre attaccate. */
  enclitics?: Record<string, { base: string; enclitica: string }>
): void {
  // le enclitiche diventano ruoli (della base) + mappa dei suffissi colorati
  let mergedRoles = enclitics ? { ...roles } : roles;
  const suffissi = new Map<string, { testo: string; colore: string }>();
  // Categoria dalla desinenza, non dall'etichetta IA: -cum preposizione;
  // -que/-ve/-ne congiunzioni. Nessun vecchio grigio incorporato.
  const encliticColor = colorForEnclitic;
  if (enclitics) {
    for (const [word, split] of Object.entries(enclitics)) {
      mergedRoles[word] = split.base;
      const endings = ENCLITIC_ENDINGS[split.enclitica] ?? ["que", "ve", "ne", "cum"];
      /* «tecum», «mecum»: base di sole 2 lettere (te/me/se) */
      const ending = endings.find((e) => word.endsWith(e) && word.length > e.length + 1);
      if (ending) {
        suffissi.set(word, { testo: ending, colore: encliticColor(ending) });
      }
    }
  }
  /* 28/10: RILEVAMENTO DETERMINISTICO delle enclitiche che l'IA salta
     (verificato: «Tecum», «Mecum», «Amasne», «Rexne» restavano senza
     enclitica, mentre «Quocum», «Habetne» no). Due casi sicuri:
     1) pronome + -cum (mecum, tecum, secum, nobiscum, vobiscum, quocum…):
        lista chiusa; la base è sempre ABLATIVO;
     2) parola che il dizionario NON conosce intera ma conosce SENZA
        -que/-ve/-ne (amasne = amas + ne, rexne = rex + ne): è base +
        enclitica. Le parole che il dizionario conosce già intere
        (nomine, bene, Cicerone) non si toccano mai. */
  for (const group of sentences) {
    for (const t of group.tokens) {
      if (t.isPunct || !t.analysis) continue;
      const w = t.word.toLowerCase();
      if (suffissi.has(w) || NON_ENCLITICHE.has(w)) continue;
      if (PRONOMI_CUM.has(w)) {
        suffissi.set(w, { testo: "cum", colore: encliticColor("cum") });
        if (mergedRoles === roles) mergedRoles = { ...roles };
        mergedRoles[w] = "ablativo";
        continue;
      }
      /* (28/10b) Collatinus riconosce già la base + tackon e lo indica nel
         campo raw («+ ne 2eme singulier…»): in quel caso l'enclitica è
         CERTA anche senza IA — tutte le opzioni devono partire con lo
         stesso «+ <tackon>». */
      const raws = t.analysis.options.map((o) => (o.raw ?? "").trim());
      if (raws.length > 0) {
        const tack = (["que", "ve", "ne", "cum"] as const).find((x) =>
          raws.every((r) => r.startsWith(`+ ${x}`))
        );
        if (tack) {
          suffissi.set(w, { testo: tack, colore: encliticColor(tack) });
          continue;
        }
      }
      if (!t.analysis.options.every((o) => o.pos === "sconosciuto")) continue;
      const e = (["que", "ve", "ne"] as const).find(
        (x) => w.endsWith(x) && w.length > x.length + 1
      );
      if (!e) continue;
      const stem = w.slice(0, -e.length);
      let known = false;
      try {
        known = parseWhitaker(stem).some((o) => o.pos !== "sconosciuto");
      } catch {
        known = false;
      }
      if (known) suffissi.set(w, { testo: e, colore: encliticColor(e) });
    }
  }
  // GUARDIA VOCATIVO (pre-pass): riscrive i ruoli prima del ciclo di
  // applicazione, così vale sia per il percorso IA sia per quello regole
  applyVocativoGuard(sentences, mergedRoles, numbers);

  for (const group of sentences) {
    for (const t of group.tokens) {
      if (t.isPunct || !t.analysis) continue;
      const suffisso = suffissi.get(t.word.toLowerCase());
      if (suffisso) t.analysis.suffisso = suffisso;
      let role = mergedRoles[t.word.toLowerCase()];
      /* Fallback DESINENZE (26/10): parola che né Whitaker né l'IA
         riconoscono (PIRATARUM, MINOTAURUM, TOTIDEMQUE…): il caso si deduce
         dalla desinenza finale e l'enclitica attaccata viene separata. */
      let guess: EndingGuess | null = null;
      if (!role && t.analysis.category === "sconosciuto") {
        guess = guessFromEnding(t.word);
        if (guess) {
          role = guess.caso;
          if (guess.suffix && !t.analysis.suffisso) {
            t.analysis.suffisso = {
              testo: guess.suffix,
              colore: colorForEnclitic(guess.suffix),
            };
          }
        }
      }
      if (!role) continue;
      // numero segnalato dall'IA (S/P): serve a scegliere l'opzione giusta
      // quando la STESSA parola ha lo stesso caso in entrambi i numeri
      // (es. «currus» nominativo singolare E plurale)
      const num = guess ? guess.numero : numbers?.[t.word.toLowerCase()];

      if (!role) continue;

      const apply = (o: AnalysisOption) => {
        const idx = t.analysis!.options.indexOf(o);
        if (idx < 0) return;
        t.analysis!.selected = idx;
        t.analysis!.category = o.pos;
        t.analysis!.color = optionColor(o);
        t.analysis!.voice = o.voice;
        t.analysis!.number = o.number;
        t.analysis!.label = o.desc;
      };

      if (role === "verbo") {
        const v =
          t.analysis.options.find(
            (o) => o.pos === "verbo" && (!num || o.number === num)
          ) ?? t.analysis.options.find((o) => o.pos === "verbo");
        if (v) {
          apply(v);
        } else if (t.analysis.category === "sconosciuto") {
          /* 27/10: verbo che il dizionario non conosce (es. «rediit»): prima
             restava NERO; ora prende il colore dell'indicativo. */
          const synth: AnalysisOption = {
            lemma: t.analysis.word,
            summary: "",
            translation: "",
            form: t.analysis.word,
            pos: "verbo",
            mood: "indicativo",
            number: num as "singolare" | "plurale" | undefined,
            freq: 1,
            desc: "verbo indicativo",
            raw: "",
          };
          t.analysis.options.push(synth);
          apply(synth);
        }
        continue;
      }
      /* 27/10: ruoli di dettaglio dell'IA — modo del verbo e tipo di parola-
         funzione. Se il dizionario non ha la lettura richiesta ma conosce
         la parola come verbo/funzione (o non la conosce affatto) si crea
         un'opzione sintetica: l'IA ha visto il contesto. Un NOME non viene
         mai trasformato in verbo/funzione da qui. */
      const MOOD_OF: Record<string, "congiuntivo" | "imperativo" | "infinito"> = {
        congiuntivo: "congiuntivo",
        imperativo: "imperativo",
        infinito: "infinito",
      };
      if (role in MOOD_OF) {
        const mood = MOOD_OF[role];
        const verbs = t.analysis.options.filter((o) => o.pos === "verbo");
        const v =
          verbs.find((o) => o.mood === mood && (!num || o.number === num)) ??
          verbs.find((o) => o.mood === mood);
        if (v) {
          apply(v);
        } else if (verbs.length > 0 || t.analysis.category === "sconosciuto") {
          const base = verbs[0];
          const synth: AnalysisOption = {
            lemma: base?.lemma ?? t.analysis.word,
            summary: base?.summary ?? "",
            translation: base?.translation ?? "",
            form: t.analysis.word,
            pos: "verbo",
            mood,
            number: (num as "singolare" | "plurale" | undefined) ?? base?.number,
            freq: 1,
            desc: `verbo ${mood}`,
            raw: "",
          };
          t.analysis.options.push(synth);
          apply(synth);
        } else {
          const v2 = t.analysis.options.find((o) => o.pos === "verbo");
          if (v2) apply(v2);
        }
        continue;
      }
      if (role === "preposizione" || role === "congiunzione" || role === "avverbio") {
        const f = t.analysis.options.find((o) => o.pos === role);
        if (f) {
          apply(f);
        } else if (
          t.analysis.category === "sconosciuto" ||
          t.analysis.options.some((o) => FUNCTION_POS.includes(o.pos))
        ) {
          const base = t.analysis.options.find((o) => FUNCTION_POS.includes(o.pos));
          const synth: AnalysisOption = {
            lemma: base?.lemma ?? t.analysis.word,
            summary: base?.summary ?? "",
            translation: base?.translation ?? "",
            form: t.analysis.word,
            pos: role,
            freq: 1,
            desc: role,
            raw: "",
          };
          t.analysis.options.push(synth);
          apply(synth);
        } else {
          const f2 = t.analysis.options.find((o) => FUNCTION_POS.includes(o.pos));
          if (f2) apply(f2);
        }
        continue;
      }
      if (role === "funzione") {
        const f = t.analysis.options.find((o) => FUNCTION_POS.includes(o.pos));
        if (f) apply(f);
        continue;
      }
      if (role === "participio") {
        const p =
          t.analysis.options.find(
            (o) =>
              o.pos === "verbo" && o.mood === "participio" && (!num || o.number === num)
          ) ??
          t.analysis.options.find((o) => o.pos === "verbo" && o.mood === "participio");
        if (p) {
          apply(p);
        } else {
          const v = t.analysis.options.find((o) => o.pos === "verbo");
          if (v) apply(v);
        }
        continue;
      }
      let wanted = t.analysis.options.find(
        (o) =>
          NOMINAL_POS.includes(o.pos) && o.case === role && (!num || o.number === num)
      );
      if (!wanted) {
        wanted = t.analysis.options.find(
          (o) => NOMINAL_POS.includes(o.pos) && o.case === role
        );
      }
      if (!wanted) {
        const synth = synthOption(t, role as ItRole);
        if (synth) {
          t.analysis.options.push(synth);
          wanted = synth;
        }
      }
      if (!wanted && (suffisso || guess || t.analysis.category === "sconosciuto")) {
        /* Parola che Whitaker non conosce per NIENTE ma di cui si conosce il
           ruolo (IA, desinenze o enclitica: «tutamque», «piratarum»,
           «minotaurum»…): senza questa opzione generica la parola resterebbe
           bianca (sconosciuta) invece del colore del caso. */
        const CASE_ROLES = new Set([
          "nominativo", "genitivo", "dativo", "accusativo", "vocativo", "ablativo",
        ]);
        if (CASE_ROLES.has(role)) {
          wanted = {
            lemma: t.analysis.word,
            summary: "",
            translation: "",
            form: t.analysis.word,
            pos: "nome",
            case: role as CaseName,
            number: (num as "singolare" | "plurale" | undefined) ?? "singolare",
            freq: 1,
            desc: `${role} ${num ?? "singolare"}`,
            raw: "",
          };
          t.analysis.options.push(wanted);
        }
      }
      if (!wanted) continue;
      apply(wanted);
    }
  }
}
