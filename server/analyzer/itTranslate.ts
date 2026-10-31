/**
 * TRADUZIONE AUTOMATICA (offline) — motore di traduzione guidata latino → italiano.
 *
 * Usa l'analisi grammaticale (persona, numero, genere, caso, tempo, modo, voce)
 * per produrre una traduzione italiana corretta e leggibile anche SENZA l'IA:
 * coniuga i verbi, accorda aggettivi e participi, pluralizza i nomi, fonde
 * preposizioni e articoli. Le forme irregolari più comuni hanno un paradigma
 * dedicato. Viene usata come ripiego quando l'IA non è disponibile, ma il
 * risultato è molto più leggibile di una lista di glosse.
 */

import type {
  AnalysisOption,
  SentenceGroup,
  TokenAnalysis,
} from "../../shared/types";

/* ======================================================================
   Paradigmi dei verbi irregolari più comuni (italiano)
   ====================================================================== */

interface Paradigm {
  pres: string[]; // indicativo presente (1s,2s,3s,1p,2p,3p)
  impf: string[];
  fut: string[];
  part: string; // participio passato (maschile singolare)
  aux: "avere" | "essere";
  cong?: string[];
}

const IRREGULAR: Record<string, Paradigm> = {
  essere: {
    pres: ["sono", "sei", "è", "siamo", "siete", "sono"],
    impf: ["ero", "eri", "era", "eravamo", "eravate", "erano"],
    fut: ["sarò", "sarai", "sarà", "saremo", "sarete", "saranno"],
    part: "stato",
    aux: "essere",
    cong: ["sia", "sia", "sia", "siamo", "siate", "siano"],
  },
  avere: {
    pres: ["ho", "hai", "ha", "abbiamo", "avete", "hanno"],
    impf: ["avevo", "avevi", "aveva", "avevamo", "avevate", "avevano"],
    fut: ["avrò", "avrai", "avrà", "avremo", "avrete", "avranno"],
    part: "avuto",
    aux: "avere",
    cong: ["abbia", "abbia", "abbia", "abbiamo", "abbiate", "abbiano"],
  },
  potere: {
    pres: ["posso", "puoi", "può", "possiamo", "potete", "possono"],
    impf: ["potevo", "potevi", "poteva", "potevamo", "potevate", "potevano"],
    fut: ["potrò", "potrai", "potrà", "potremo", "potrete", "potranno"],
    part: "potuto",
    aux: "avere",
    cong: ["possa", "possa", "possa", "possiamo", "possiate", "possano"],
  },
  volere: {
    pres: ["voglio", "vuoi", "vuole", "vogliamo", "volete", "vogliono"],
    impf: ["volevo", "volevi", "voleva", "volevamo", "volevate", "volevano"],
    fut: ["vorrò", "vorrai", "vorrà", "vorremo", "vorrete", "vorranno"],
    part: "voluto",
    aux: "avere",
    cong: ["voglia", "voglia", "voglia", "vogliamo", "vogliate", "vogliano"],
  },
  dovere: {
    pres: ["devo", "devi", "deve", "dobbiamo", "dovete", "devono"],
    impf: ["dovevo", "dovevi", "doveva", "dovevamo", "dovevate", "dovevano"],
    fut: ["dovrò", "dovrai", "dovrà", "dovremo", "dovrete", "dovranno"],
    part: "dovuto",
    aux: "avere",
    cong: ["debba", "debba", "debba", "dobbiamo", "dobbiate", "debbano"],
  },
  sapere: {
    pres: ["so", "sai", "sa", "sappiamo", "sapete", "sanno"],
    impf: ["sapevo", "sapevi", "sapeva", "sapevamo", "sapevate", "sapevano"],
    fut: ["saprò", "saprai", "saprà", "sapremo", "saprete", "sapranno"],
    part: "saputo",
    aux: "avere",
    cong: ["sappia", "sappia", "sappia", "sappiamo", "sappiate", "sappiano"],
  },
  stare: {
    pres: ["sto", "stai", "sta", "stiamo", "state", "stanno"],
    impf: ["stavo", "stavi", "stava", "stavamo", "stavate", "stavano"],
    fut: ["starò", "starai", "starà", "staremo", "starete", "staranno"],
    part: "stato",
    aux: "essere",
    cong: ["stia", "stia", "stia", "stiamo", "stiate", "stiano"],
  },
  andare: {
    pres: ["vado", "vai", "va", "andiamo", "andate", "vanno"],
    impf: ["andavo", "andavi", "andava", "andavamo", "andavate", "andavano"],
    fut: ["andrò", "andrai", "andrà", "andremo", "andrete", "andranno"],
    part: "andato",
    aux: "essere",
    cong: ["vada", "vada", "vada", "andiamo", "andiate", "vadano"],
  },
  fare: {
    pres: ["faccio", "fai", "fa", "facciamo", "fate", "fanno"],
    impf: ["facevo", "facevi", "faceva", "facevamo", "facevate", "facevano"],
    fut: ["farò", "farai", "farà", "faremo", "farete", "faranno"],
    part: "fatto",
    aux: "avere",
    cong: ["faccia", "faccia", "faccia", "facciamo", "facciate", "facciano"],
  },
  dire: {
    pres: ["dico", "dici", "dice", "diciamo", "dite", "dicono"],
    impf: ["dicevo", "dicevi", "diceva", "dicevamo", "dicevate", "dicevano"],
    fut: ["dirò", "dirai", "dirà", "diremo", "direte", "diranno"],
    part: "detto",
    aux: "avere",
    cong: ["dica", "dica", "dica", "diciamo", "diciate", "dicano"],
  },
  dare: {
    pres: ["do", "dai", "dà", "diamo", "date", "danno"],
    impf: ["davo", "davi", "dava", "davamo", "davate", "davano"],
    fut: ["darò", "darai", "darà", "daremo", "darete", "daranno"],
    part: "dato",
    aux: "avere",
    cong: ["dia", "dia", "dia", "diamo", "diate", "diano"],
  },
  venire: {
    pres: ["vengo", "vieni", "viene", "veniamo", "venite", "vengono"],
    impf: ["venivo", "venivi", "veniva", "venivamo", "venivate", "venivano"],
    fut: ["verrò", "verrai", "verrà", "verremo", "verrete", "verranno"],
    part: "venuto",
    aux: "essere",
    cong: ["venga", "venga", "venga", "veniamo", "veniate", "vengano"],
  },
  tenere: {
    pres: ["tengo", "tieni", "tiene", "teniamo", "tenete", "tengono"],
    impf: ["tenevo", "tenevi", "teneva", "tenevamo", "tenevate", "tenevano"],
    fut: ["terrò", "terrai", "terrà", "terremo", "terrete", "terranno"],
    part: "tenuto",
    aux: "avere",
    cong: ["tenga", "tenga", "tenga", "teniamo", "teniate", "tengano"],
  },
  vedere: {
    pres: ["vedo", "vedi", "vede", "vediamo", "vedete", "vedono"],
    impf: ["vedevo", "vedevi", "vedeva", "vedevamo", "vedevate", "vedevano"],
    fut: ["vedrò", "vedrai", "vedrà", "vedremo", "vedrete", "vedranno"],
    part: "visto",
    aux: "avere",
    cong: ["veda", "veda", "veda", "vediamo", "vediate", "vedano"],
  },
  bere: {
    pres: ["bevo", "bevi", "beve", "beviamo", "bevete", "bevono"],
    impf: ["bevevo", "bevevi", "beveva", "bevevamo", "bevevate", "bevevano"],
    fut: ["berrò", "berrai", "berrà", "berremo", "berrete", "berranno"],
    part: "bevuto",
    aux: "avere",
  },
  uscire: {
    pres: ["esco", "esci", "esce", "usciamo", "uscite", "escono"],
    impf: ["uscivo", "uscivi", "usciva", "uscivamo", "uscivate", "uscivano"],
    fut: ["uscirò", "uscirai", "uscirà", "usciremo", "uscirete", "usciranno"],
    part: "uscito",
    aux: "essere",
  },
  "non volere": {
    pres: ["non voglio", "non vuoi", "non vuole", "non vogliamo", "non volete", "non vogliono"],
    impf: ["non volevo", "non volevi", "non voleva", "non volevamo", "non volevate", "non volevano"],
    fut: ["non vorrò", "non vorrai", "non vorrà", "non vorremo", "non vorrete", "non vorranno"],
    part: "voluto",
    aux: "avere",
    cong: ["non voglia", "non voglia", "non voglia", "non vogliamo", "non vogliate", "non vogliano"],
  },
  preferire: {
    pres: ["preferisco", "preferisci", "preferisce", "preferiamo", "preferite", "preferiscono"],
    impf: ["preferivo", "preferivi", "preferiva", "preferivamo", "preferivate", "preferivano"],
    fut: ["preferirò", "preferirai", "preferirà", "preferiremo", "preferirete", "preferiranno"],
    part: "preferito",
    aux: "avere",
    cong: ["preferisca", "preferisca", "preferisca", "preferiamo", "preferiate", "preferiscano"],
  },
  "essere fatto": {
    pres: ["sono fatto", "sei fatto", "è fatto", "siamo fatti", "siete fatti", "sono fatti"],
    impf: ["ero fatto", "eri fatto", "era fatto", "eravamo fatti", "eravate fatti", "erano fatti"],
    fut: ["sarò fatto", "sarai fatto", "sarà fatto", "saremo fatti", "sarete fatti", "saranno fatti"],
    part: "fatto",
    aux: "essere",
    cong: ["sia fatto", "sia fatto", "sia fatto", "siamo fatti", "siate fatti", "siano fatti"],
  },
};

/** Participi passati irregolari comuni (chiave: infinito italiano) */
const IRREG_PART: Record<string, string> = {
  vedere: "visto",
  scrivere: "scritto",
  leggere: "letto",
  eleggere: "eletto",
  proteggere: "protetto",
  correggere: "corretto",
  vincere: "vinto",
  convincere: "convinto",
  uccidere: "ucciso",
  prendere: "preso",
  mettere: "messo",
  aprire: "aperto",
  coprire: "coperto",
  scoprire: "scoperto",
  offrire: "offerto",
  soffrire: "sofferto",
  correre: "corso",
  perdere: "perso",
  rispondere: "risposto",
  chiedere: "chiesto",
  muovere: "mosso",
  piangere: "pianto",
  spingere: "spinto",
  stringere: "stretto",
  accendere: "acceso",
  spendere: "speso",
  difendere: "difeso",
  nascondere: "nascosto",
  ridere: "riso",
  sorridere: "sorriso",
  scegliere: "scelto",
  rompere: "rotto",
  rimanere: "rimasto",
  nascere: "nato",
  distruggere: "distrutto",
  venire: "venuto",
  giungere2: "giunto",
  regnare: "regnato",
  fuggire: "fuggito",
  piacere: "piaciuto",
  obbedire: "obbedito",
  combattere: "combattuto",
  "essere fatto": "fatto",
  vivere: "vissuto",
  morire: "morto",
  dividere: "diviso",
  giungere: "giunto",
  pungere: "punto",
  dipingere: "dipinto",
  fingere: "finto",
  tingere: "tinto",
  spargere: "sparso",
  dirigere: "diretto",
  flettere: "flesso",
  riflettere: "riflesso",
  discutere: "discusso",
  volgere: "volto",
  rivolgere: "rivolto",
  torcere: "torto",
  frangere: "franto",
  espellere: "espulso",
  produrre: "prodotto",
  condurre: "condotto",
  tradurre: "tradotto",
  ridurre: "ridotto",
  introdurre: "introdotto",
  dedurre: "dedotto",
  contendere: "conteso",
};

/**
 * VERBI DEPONENTI noti: hanno forma passiva in latino ma significato attivo.
 * Whitaker le marca come PASSIVE; qui forziamo la resa attiva italiana.
 * Chiave: primo token del lemma normalizzato.
 */
const DEPONENTS = new Set([
  "adipiscor", "admiror", "aggredior", "arbitror", "auxilior", "bellor",
  "comitor", "conor", "confiteor", "congredior", "consequor", "cunctor",
  "deprecor", "dominor", "egredior", "expergiscor", "experior", "fateor",
  "fruor", "fungor", "gradior", "hortor", "imitor", "ingredior", "largior",
  "loquor", "medeor", "mentior", "miror", "misereor", "morior", "moror",
  "nanciscor", "nascor", "nitor", "obliviscor", "orior", "patior",
  "persequor", "potior", "precor", "proficiscor", "progredior", "prosequor",
  "queror", "recordor", "regredior", "reminiscor", "reor", "revertor",
  "sequor", "suspicor", "transgredior", "utor", "vereor", "vescor",
  "laetor", "gaudeo", "audeo", "soleo", "confido", "diffido",
  "pascor", "patior", "proficiscor", "morior", "nascor", "revertor",
]);

/** Estrae il primo token del lemma (es. «sequor, sequi, secutus sum» → «sequor»). */
function lemmaKey(lemma: string | undefined): string {
  return (lemma ?? "").split(",")[0]?.trim().toLowerCase() ?? "";
}

/** True se il lemma è un verbo deponente noto. */
function isDeponent(lemma: string | undefined): boolean {
  const k = lemmaKey(lemma);
  if (DEPONENTS.has(k)) return true;
  // alcuni deponenti non in lista: il lemma contiene un perfetto in «… sum»
  const parts = (lemma ?? "").split(",").map((s) => s.trim());
  return parts.length >= 3 && parts.slice(1).some((s) => / sum$/i.test(s));
}

/**
 * Passato remoto (perfetto latino → resa scolastica): tabella delle
 * irregolarità più comuni + generazione regolare come fallback.
 * Chiave: infinito italiano.
 */
const PASS_REM: Record<string, string[]> = {
  // essere / avere / modali
  essere: ["fui", "fosti", "fu", "fummo", "foste", "furono"],
  avere: ["ebbi", "avesti", "ebbe", "avemmo", "aveste", "ebbero"],
  potere: ["potei", "potesti", "poté", "potemmo", "poteste", "poterono"],
  volere: ["volli", "volesti", "volle", "volemmo", "voleste", "vollero"],
  "non volere": ["non volli", "non volesti", "non volle", "non volemmo", "non voleste", "non vollero"],
  preferire: ["preferii", "preferisti", "preferì", "preferimmo", "preferiste", "preferirono"],
  dovere: ["dovei", "dovesti", "dovette", "dovemmo", "doveste", "dovettero"],
  sapere: ["seppi", "sapesti", "seppe", "sapemmo", "sapeste", "seppero"],
  stare: ["stetti", "stesti", "stette", "stemmo", "steste", "stettero"],
  andare: ["andai", "andasti", "andò", "andammo", "andaste", "andarono"],
  venire: ["venni", "venisti", "venne", "venimmo", "veniste", "vennero"],
  vedere: ["vidi", "vedesti", "vide", "vedemmo", "vedeste", "videro"],
  fare: ["feci", "facesti", "fece", "facemmo", "faceste", "fecero"],
  dire: ["dissi", "dicesti", "disse", "dicemmo", "diceste", "dissero"],
  dare: ["diedi", "desti", "diede", "demmo", "deste", "diedero"],
  prendere: ["presi", "prendesti", "prese", "prendemmo", "prendeste", "presero"],
  condurre: ["condussi", "conducesti", "condusse", "conducemmo", "conduceste", "condussero"],
  produrre: ["produssi", "producesti", "produsse", "producemmo", "produceste", "produssero"],
  tradurre: ["tradussi", "traducesti", "tradusse", "traducemmo", "traduceste", "tradussero"],
  vincere: ["vinsi", "vincesti", "vinse", "vincemmo", "vinceste", "vinsero"],
  uccidere: ["uccisi", "uccidesti", "uccise", "uccidemmo", "uccideste", "uccisero"],
  cadere: ["caddi", "cadesti", "cadde", "cademmo", "cadeste", "caddero"],
  chiudere: ["chiusi", "chiudesti", "chiuse", "chiudemmo", "chiudeste", "chiusero"],
  correre: ["corsi", "corresti", "corse", "corremmo", "correste", "corsero"],
  perdere: ["persi", "perdesti", "perse", "perdemmo", "perdeste", "persero"],
  rispondere: ["risposi", "rispondesti", "rispose", "rispondemmo", "rispondeste", "risposero"],
  chiedere: ["chiesi", "chiedesti", "chiese", "chiedemmo", "chiedeste", "chiesero"],
  muovere: [" mossi", "movesti", "mosse", "movemmo", "moveste", "mossero"],
  piangere: ["piansi", "piangesti", "pianse", "piangemmo", "piangeste", "piansero"],
  spingere: ["spinsi", "spingesti", "spinse", "spingemmo", "spingeste", "spinsero"],
  mettere: ["misi", "mettesti", "mise", "mettemmo", "metteste", "misero"],
  scrivere: ["scrissi", "scrivesti", "scrisse", "scrivemmo", "scriveste", "scrissero"],
  leggere: ["lessi", "leggesti", "lesse", "leggemmo", "leggeste", "lessero"],
  aprire: [" aprii", "apristi", "aprì", "aprimmo", "apriste", "aprirono"],
  rompere: ["ruppi", "rompesti", "ruppe", "rompemmo", "rompeste", "ruppero"],
  scegliere: ["scelsi", "scegliesti", "scelse", "scegliemmo", "sceglieste", "scelsero"],
  dividere: ["divisi", "dividesti", "divise", "dividemmo", "divideste", "divisero"],
  giungere: ["giunsi", "giungesti", "giunse", "giungemmo", "giungeste", "giunsero"],
  vivere: ["vissi", "vivesti", "visse", "vivemmo", "viveste", "vissero"],
  morire: ["morii", "moristi", "morì", "morimmo", "moriste", "morirono"],
  nascere: ["nacqui", "nascesti", "nacque", "nacemmo", "nasceste", "nacquero"],
  rimanere: ["rimasi", "rimanesti", "rimase", "rimanemmo", "rimaneste", "rimasero"],
  espugnare: ["espugnai", "espugnasti", "espugnò", "espugnamo", "espugnaste", "espugnarono"],
  attraversare: ["attraversai", "attraversasti", "attraversò", "attraversammo", "attraversaste", "attraversarono"],
  mandare: ["mandai", "mandasti", "mandò", "mandammo", "mandaste", "mandarono"],
  portare: ["portai", "portasti", "portò", "portammo", "portaste", "portarono"],
  partire: ["partii", "partisti", "partì", "partimmo", "partiste", "partirono"],
  seguire: ["seguii", "seguisti", "seguì", "seguimmo", "seguiste", "seguirono"],
  parlare: ["parlai", "parlasti", "parlò", "parlammo", "parlaste", "parlarono"],
  esortare: ["esortai", "esortasti", "esortò", "esortammo", "esortaste", "esortarono"],
  "rallegrarsi": ["mi rallegrai", "ti rallegrasti", "si rallegrò", "ci rallegrammo", "vi rallegraste", "si rallegrarono"],
  gioire: ["gioii", "gioisti", "gioì", "gioimmo", "gioiste", "gioirono"],
  regnare: ["regnai", "regnasti", "regnò", "regnammo", "regnaste", "regnarono"],
  fuggire: ["fuggii", "fuggisti", "fuggì", "fuggimmo", "fuggiste", "fuggirono"],
  "ritirarsi": ["mi ritirai", "ti ritirasti", "si ritirò", "ci ritirammo", "vi ritiraste", "si ritirarono"],
  "allontanarsi": ["mi allontanai", "ti allontanasti", "si allontanò", "ci allontanammo", "vi allontanaste", "si allontanarono"],
  "mettersi in viaggio": ["mi misi in viaggio", "ti mettesti in viaggio", "si mise in viaggio", "ci mettemmo in viaggio", "vi metteste in viaggio", "si misero in viaggio"],
  combattere: ["combattei", "combattesti", "combatté", "combattemmo", "combatteste", "combatterono"],
  vincere2: ["vinsi", "vincesti", "vinse", "vincemmo", "vinceste", "vinsero"],
  superare: ["superai", "superasti", "superò", "superammo", "superaste", "superarono"],
  attraversare2: ["attraversai", "attraversasti", "attraversò", "attraversammo", "attraversaste", "attraversarono"],
};

/** Passato remoto regolare di un verbo italiano (fallback). */
function passRemRegular(inf: string, idx: number): string | null {
  const conj = conjOf(inf);
  if (!conj) return null;
  const s = stem(inf);
  if (conj === "are")
    return [s + "ai", s + "asti", s + "ò", s + "ammo", s + "aste", s + "arono"][idx];
  if (conj === "ire")
    return [s + "ii", s + "isti", s + "ì", s + "immo", s + "iste", s + "irono"][idx];
  return [s + "ei", s + "esti", s + "é", s + "emmo", s + "este", s + "erono"][idx];
}

/** Passato remoto italiano del verbo (tabella irregolari + fallback regolare). */
function passatoRemoto(inf: string, idx: number): string | null {
  const irr = PASS_REM[inf.toLowerCase()];
  if (irr) return irr[idx]?.trim() ?? null;
  return passRemRegular(inf, idx);
}

/**
 * Parole di servizio con glossa italiana errata o mancante (il dizionario
 * restituisce inglese, un nome, un verbo o la forma di lemma): qui la forma
 * corretta per la traduzione automatica. Chiave: forma normalizzata.
 */
const FUNCTION_WORDS: Record<string, string> = {
  sive: "o",
  quoniam: "poiché",
  donec: "finché",
  postquam: "dopo che",
  antequam: "prima che",
  quin: "che",
  sine: "senza",
  circum: "intorno a",
  penes: "presso",
  versus: "verso",
  inter: "tra",
  haud: "non",
  iam: "ormai",
  mox: "presto",
  interdum: "talvolta",
  magnopere: "molto",
  maxime: "soprattutto",
  minime: "per niente",
  ita: "così",
  tantum: "solo",
  solum: "solo",
  modo: "solo",
  quidem: "certamente",
  vero: "invece",
  porro: "inoltre",
  item: "pure",
  simul: "insieme",
  illic: "lì",
  foras: "fuori",
  intus: "dentro",
  procul: "lontano",
  cito: "presto",
  utrum: "se",
  libenter: "volentieri",
  certe: "certamente",
  profecto: "certamente",
  sane: "certamente",
  immo: "anzi",
  longe: "di gran lunga",
  quoque: "anche",
  autem: "invece",
  enim: "infatti",
  igitur: "quindi",
  itaque: "perciò",
  ergo: "dunque",
  tandem: "infine",
  deinde: "poi",
  etiam: "anche",
  tamen: "tuttavia",
  quia: "perché",
  simulac: "appena",
  quoad: "finché",
  priusquam: "prima che",
  nam: "infatti",
};

/**
 * Plurali irregolari italiani dei sostantivi più comuni (chiave: singolare).
 * Es. «bos» → «bue» → «buoi» (non «bui»).
 */
const IRREG_PLURALS: Record<string, string> = {
  bue: "buoi",
  uomo: "uomini",
  dio: "dei",
  uovo: "uova",
  tempio: "templi",
  miglio: "miglia",
  osso: "ossa",
  centinaio: "centinaia",
  migliaio: "migliaia",
};

/** Comparativi irregolari italiani (chiave: positivo) */
const COMP_IRR: Record<string, string> = {
  buono: "migliore",
  cattivo: "peggiore",
  grande: "maggiore",
  piccolo: "minore",
  alto: "superiore",
  basso: "inferiore",
};

/** Superlativi irregolari italiani (chiave: positivo) */
const SUPER_IRR: Record<string, string> = {
  buono: "ottimo",
  cattivo: "pessimo",
  grande: "grandissimo",
  piccolo: "piccolissimo",
  alto: "sommo",
  basso: "infimo",
};

/** Aggettivi/numerali invariabili al plurale */
const INVARIANT_ADJ = new Set([
  "tre", "due", "sei", "sette", "otto", "nove", "dieci", "undici", "dodici",
  "tredici", "quattordici", "quindici", "sedici", "diciassette", "diciotto",
  "diciannove", "venti", "trenta", "quaranta", "cinquanta", "sessanta",
  "settanta", "ottanta", "novanta", "cento", "mille", "più", "meno",
]);

/** Infiniti latini irregolari → infinito italiano */
const LATIN_INF: Record<string, string> = {
  esse: "essere",
  posse: "potere",
  velle: "volere",
  nolle: "non volere",
  malle: "preferire",
  ire: "andare",
  ferre: "portare",
  fieri: "diventare",
  "ire in": "andare",
  // normalizzazione grafica di infiniti latini usati come glossa
  defendere: "difendere",
  offendere: "offendere",
  ascendere: "ascendere",
  "descendere": "scendere",
  intellegere: "capire",
  "intelligere": "capire",
  "legere": "leggere",
  "capere": "prendere",
  "facere": "fare",
  "iacere": "gettare",
  "dicere": "dire",
  "ducere": "condurre",
  "mittere": "mandare",
  "scribere": "scrivere",
  "accipere": "ricevere",
};

/* ======================================================================
   Util
   ====================================================================== */

function firstMeaning(s: string): string {
  // separa anche sul «;» (es. «maggiore; antenato (pl. maiores)» → «maggiore»)
  return s.split(/[,;]/)[0].trim();
}

function cap(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function stem(inf: string): string {
  return inf.slice(0, -3);
}

type ConjKind = "are" | "ere" | "ire";

function conjOf(inf: string): ConjKind | null {
  const l = inf.toLowerCase();
  if (l.endsWith("are")) return "are";
  if (l.endsWith("ire")) return "ire";
  if (l.endsWith("ere")) return "ere";
  return null;
}

function personIdx(person: number | undefined, number: string | undefined): number {
  const p = person ?? 3;
  const plural = number === "plurale";
  return Math.max(0, Math.min(2, p - 1)) + (plural ? 3 : 0);
}

const PRES_ARE = ["o", "i", "a", "iamo", "ate", "ano"];
const PRES_ERE = ["o", "i", "e", "iamo", "ete", "ono"];
const PRES_IRE = ["o", "i", "e", "iamo", "ite", "ono"];
const IMPF_ARE = ["avo", "avi", "ava", "avamo", "avate", "avano"];
const IMPF_ERE = ["evo", "evi", "eva", "evamo", "evate", "evano"];
const FUT_ARE = ["erò", "erai", "erà", "eremo", "erete", "eranno"];
const FUT_IRE = ["irò", "irai", "irà", "iremo", "irete", "iranno"];
const CONG_ARE = ["i", "i", "i", "iamo", "iate", "ino"];
const CONG_ERE = ["a", "a", "a", "iamo", "iate", "ano"];
const CONG_IMPF_ARE = ["assi", "assi", "asse", "assimo", "aste", "assero"];
const CONG_IMPF_ERE = ["essi", "essi", "esse", "essimo", "este", "essero"];

/* ======================================================================
   Coniugazione
   ====================================================================== */

function partPassato(inf: string): string {
  const l = inf.toLowerCase();
  if (IRREG_PART[l]) return IRREG_PART[l];
  const conj = conjOf(l);
  if (!conj) return inf;
  const s = stem(l);
  return s + (conj === "are" ? "ato" : conj === "ire" ? "ito" : "uto");
}

function agreePart(part: string, gender?: string, number?: string): string {
  let p = part;
  if (gender === "femminile" && p.endsWith("o")) p = p.slice(0, -1) + "a";
  if (number === "plurale") {
    if (p.endsWith("o")) p = p.slice(0, -1) + "i";
    else if (p.endsWith("a")) p = p.slice(0, -1) + "e";
  }
  return p;
}

/** Infinito italiano del verbo: dalla glossa, o dal lemma (2° elemento). */
export function verbInfinitive(opt: AnalysisOption): string {
  // fio (fieri): nelle versioni scolastiche è quasi sempre il passivo di facio
  if (lemmaKey(opt.lemma) === "fio" || lemmaKey(opt.lemma) === "fieri") return "essere fatto";
  // «videri» (infinito passivo di video): vale «sembrare, apparire»
  if (
    lemmaKey(opt.lemma) === "video" &&
    opt.mood === "infinito" &&
    opt.voice === "passivo"
  )
    return "sembrare";
  const g = firstMeaning(opt.translation || "");
  if (g) return g;
  const lemma = opt.lemma || "";
  const parts = lemma.split(",").map((s) => s.trim());
  if (parts.length >= 2) {
    const inf = parts[1];
    if (LATIN_INF[inf]) return LATIN_INF[inf];
    if (conjOf(inf)) return inf;
  }
  return lemma;
}

/** Verbi italiani in -ire con infisso -isc- al presente (gioire → gioisco). */
const ISC_VERBS = new Set([
  "gioire", "preferire", "capire", "finire", "obbedire", "costruire", "unire",
  "punire", "rapire", "ferire", "guarire", "istruire", "agire", "esaurire",
  "colpire", "tradire", "stabilire", "fornire", "nutrire", "patire", "subire",
  "cucire", "pulire", "spedire", "restituire", "sostituire", "distribuire",
  "contribuire", "proibire", "impedire", "ubbidire", "apparire", "comparire",
  "inserire", "trasferire", "preferire2", "mentire", "partire2", "seguire2",
]);

export function conjugateVerb(inf: string, opt: AnalysisOption, subjectGender?: string): string {
  const l = inf.toLowerCase();
  const irr = IRREGULAR[l];
  const conj = conjOf(l);
  const idx = personIdx(opt.person, opt.number);
  const tense = opt.tense ?? "presente";
  const mood = opt.mood ?? "indicativo";
  // deponenti: la voce passiva latina va resa ATTIVA in italiano.
  // «pascor» (pascolare) ha lemma attivo «pasco» in Whitaker: le forme passive
  // come «pascuntur» vanno rese attive («i buoi pascolano», non «sono pascolati»).
  const voice =
    opt.voice === "passivo" && lemmaKey(opt.lemma) === "pasco"
      ? "attivo"
      : isDeponent(opt.lemma)
        ? "attivo"
        : (opt.voice ?? "attivo");
  // per il passivo si accorda con il genere del soggetto (primo nome della frase)
  const gen = opt.gender ?? subjectGender;
  const part = agreePart(irr?.part ?? partPassato(l), gen, opt.number);
  const essere = IRREGULAR.essere;
  const avere = IRREGULAR.avere;
  const auxArr = irr?.aux === "essere" ? essere : avere;

  // Voce passiva: ausiliare «essere» + participio
  if (voice === "passivo" && (mood === "indicativo" || mood === "congiuntivo")) {
    let aux: string;
    switch (tense) {
      case "imperfetto":
        aux = essere.impf[idx];
        break;
      case "futuro":
        aux = essere.fut[idx];
        break;
      case "perfetto":
        // «amatus est» → «fu amato» (perfetto passivo: passato remoto di essere)
        aux = ["fui", "fosti", "fu", "fummo", "foste", "furono"][idx] ?? essere.pres[idx];
        break;
      case "piuccheperfetto":
        aux = essere.impf[idx] + (gen === "femminile" ? " stata" : " stato");
        break;
      default:
        aux = essere.pres[idx];
    }
    return `${aux} ${part}`;
  }

  const regular = (endings: string[]): string => {
    if (!conj) return l;
    return stem(l) + endings[idx];
  };

  const s = stem(l);

  // verbi riflessivi italiani in -rsi (rallegrarsi, allontanarsi…): pronome + base
  if (l.endsWith("rsi")) {
    const base = l.slice(0, -2) + "e"; // «rallegrarsi» → «rallegrare» (lo slice toglie «si», serve la -e)
    const pron = ["mi ", "ti ", "si ", "ci ", "vi ", "si "][idx];
    const bConj = conjOf(base);
    const bIr = IRREGULAR[base];
    if (bConj || bIr) {
      const gen = (opt.gender ?? subjectGender) as
        | "maschile"
        | "femminile"
        | "neutro"
        | undefined;
      const aux = { ...opt, gender: gen };
      const inner = conjugateVerb(base, aux, subjectGender).trim();
      return `${pron}${inner}`;
    }
  }

  // presente indicativo di un verbo in -isc- (gioire → gioisco)
  if (conj === "ire" && ISC_VERBS.has(l) && mood === "indicativo" && tense === "presente") {
    return [s + "isco", s + "isci", s + "isce", s + "iamo", s + "ite", s + "iscono"][idx];
  }

  switch (mood) {
    case "indicativo": {
      switch (tense) {
        case "presente":
          return irr ? irr.pres[idx] : regular(conj === "are" ? PRES_ARE : conj === "ire" ? PRES_IRE : PRES_ERE);
        case "imperfetto":
          return irr ? irr.impf[idx] : regular(conj === "are" ? IMPF_ARE : IMPF_ERE);
        case "futuro":
          return irr ? irr.fut[idx] : regular(conj === "are" ? FUT_ARE : FUT_IRE);
        case "perfetto":
          // perfetto narrativo → passato remoto italiano (resa scolastica)
          return passatoRemoto(l, idx) ?? `${auxArr.pres[idx]} ${part}`;
        case "piuccheperfetto":
          return `${auxArr.impf[idx]} ${part}`;
        case "futuro anteriore":
          return `${auxArr.fut[idx]} ${part}`;
        default:
          return l;
      }
    }
    case "congiuntivo": {
      if (tense === "piuccheperfetto") return `fosse ${part}`;
      if (tense === "perfetto") return `sia ${part}`;
      if (tense === "imperfetto") return regular(conj === "are" ? CONG_IMPF_ARE : CONG_IMPF_ERE);
      if (irr?.cong) return irr.cong[idx];
      if (conj === "ire" && ISC_VERBS.has(l))
        return [s + "isca", s + "isca", s + "isca", s + "iamo", s + "iate", s + "iscano"][idx];
      return regular(conj === "are" ? CONG_ARE : CONG_ERE);
    }
    case "imperativo": {
      if (idx === 1) return stem(l) + (conj === "are" ? "a" : "i");
      if (idx === 4) return stem(l) + (conj === "are" ? "ate" : conj === "ire" ? "ite" : "ete");
      return l;
    }
    case "infinito": {
      if (tense === "perfetto") return `${irr?.aux === "essere" ? "essere" : "avere"} ${part}`;
      return l;
    }
    default:
      return l;
  }
}

/* ======================================================================
   Nomi, aggettivi, pronomi
   ====================================================================== */

/** Articolo determinativo italiano per un sostantivo singolare. */
function definiteArticle(gender?: string, base?: string): string {
  if (!base) return gender === "femminile" ? "la" : "il";
  if (/^[aeiouàèéìòù]/i.test(base)) return "l'";
  if (gender === "femminile") return "la";
  if (/^(s|z)(?=[bcdfglmnprstv])/.test(base) || /^(gn|ps|pn|x|y)/i.test(base)) return "lo";
  return "il";
}

/** Complemento di specificazione: «militum» → «dei soldati», «Romae» → «di Roma». */
function genitiveGloss(out: string, opt: AnalysisOption): string {
  const gen = opt.gender;
  const plu = opt.number === "plurale";
  const m = out.match(/^(l'|la |il |lo |le |i |gli |un |una )(.+)$/i);
  const base = m ? m[2] : out;
  const isProper = /^[A-ZÀ-Ù]/.test(base.trim());
  if (isProper) return `di ${base}`;
  if (plu) return `${gen === "femminile" ? "delle" : "dei"} ${base}`;
  if (/^[aeiouàèéìòù]/i.test(base)) return `dell'${base}`;
  return `${gen === "femminile" ? "della" : "del"} ${base}`;
}

function nounGloss(gloss: string, opt: AnalysisOption): string {
  const g = firstMeaning(gloss);
  const gen = opt.gender;
  const m = g.match(/^(l'|la |il |lo |le |i |gli |un |una )(.+)$/i);
  const rest = m ? m[2].trim() : g;
  const article = m ? m[1].trim().toLowerCase() : null;

  // glossa già plurale («le truppe», «i soldati») → non ri-pluralizzare
  if (article === "le" || article === "i" || article === "gli") return g;
  if (opt.number !== "plurale") {
    // articolo determinativo per i nomi comuni singolari (non propri,
    // non vocativi/genitivi, non già articolati)
    if (!article && opt.case && opt.case !== "vocativo" && opt.case !== "genitivo") {
      const isProper = /^[A-ZÀ-Ù]/.test(rest.trim());
      if (!isProper && rest.length > 2) {
        const art = definiteArticle(gen, rest);
        return `${art}${art.endsWith("'") ? "" : " "}${rest}`;
      }
    }
    return g;
  }

  // plurale: plurali irregolari italiani («bue» → «buoi», «uomo» → «uomini»)
  let noun = rest;
  const irr = IRREG_PLURALS[rest.toLowerCase()];
  if (irr) noun = irr;
  else if (/[àùìòé]$/.test(rest) || rest.length <= 2) noun = rest; // invariabili
  else {
    if (noun.endsWith("o")) noun = noun.slice(0, -1) + "i";
    else if (noun.endsWith("a")) noun = noun.slice(0, -1) + (gen === "maschile" ? "i" : "e");
    else if (noun.endsWith("e")) noun = noun.slice(0, -1) + "i";
    else if (noun.endsWith("ie")) noun = noun; // serie, specie
  }

  // articolo plurale per i nomi comuni senza articolo («buoi» → «i buoi»)
  if (!article && opt.case && opt.case !== "vocativo" && opt.case !== "genitivo") {
    const isProper = /^[A-ZÀ-Ù]/.test(noun.trim());
    if (!isProper && noun.length > 2) {
      return `${gen === "femminile" ? "le " : "i "}${noun}`;
    }
  }

  return (article ? pluralArticle(article, gen) + " " : "") + noun;
}

/**
 * Aggettivo con grado comparativo/superlativo: «maior» (glossa «grande»,
 * comparativo) → «maggiore»; «maximus» (superlativo) → «grandissimo».
 */
function degreeAdj(gloss: string, opt: AnalysisOption): string {
  const deg = opt.degree;
  if (!deg || deg === "positivo") return gloss;
  if (deg === "comparativo") {
    return COMP_IRR[gloss] ?? `più ${gloss}`;
  }
  // superlativo
  const irr = SUPER_IRR[gloss];
  if (irr) return irr;
  if (gloss.endsWith("o") || gloss.endsWith("a")) return gloss.slice(0, -1) + "issimo";
  if (gloss.endsWith("e")) return gloss.slice(0, -1) + "issimo";
  // aggettivi in -is («nobilis» → «nobilissimo», «fortis» → «fortissimo»)
  if (gloss.endsWith("is") && gloss.length > 4) return gloss.slice(0, -2) + "issimo";
  return `il più ${gloss}`;
}

function pluralArticle(article: string, gen?: string): string {
  switch (article) {
    case "la":
    case "una":
      return gen === "maschile" ? "i" : "le";
    case "il":
    case "lo":
    case "un":
      return "i";
    case "l'":
      return gen === "femminile" ? "le" : "gli";
    default:
      return article;
  }
}

function adjGloss(gloss: string, opt: AnalysisOption, subjectGender?: string): string {
  const g = firstMeaning(gloss).trim();
  if (g.includes(" ") || g.includes("'") || g === "" || INVARIANT_ADJ.has(g)) return g;
  let w = degreeAdj(g, opt);
  // comparativo/superlativo: già coniugato («migliore», «grandissimo»)
  if (opt.degree && opt.degree !== "positivo") {
    if (opt.number === "plurale") {
      if (w.endsWith("e")) w = w.slice(0, -1) + "i";
      else if (w.endsWith("o")) w = w.slice(0, -1) + "i";
      else if (w.endsWith("a")) w = w.slice(0, -1) + "e";
    }
    return w;
  }
  w = g;
  // il genere mancante si ricava dal soggetto («omnis» con soggetto femminile → «tutta»)
  const fem = (opt.gender ?? subjectGender) === "femminile";
  const plu = opt.number === "plurale";
  if (w.endsWith("o")) {
    if (plu) w = w.slice(0, -1) + (fem ? "e" : "i");
    else if (fem) w = w.slice(0, -1) + "a";
  } else if (w.endsWith("e") && plu) {
    w = w.slice(0, -1) + "i";
  } else if (w.endsWith("a") && plu) {
    w = w.slice(0, -1) + "e";
  }
  return w;
}

/** Fonde preposizioni e articoli: «in la parte» → «nella parte» */
function mergeArticles(s: string): string {
  const map: Record<string, Record<string, string>> = {
    in: { il: "nel", lo: "nello", la: "nella", i: "nei", gli: "negli", le: "nelle", "l'": "nell'" },
    a: { il: "al", lo: "allo", la: "alla", i: "ai", gli: "agli", le: "alle", "l'": "all'" },
    da: { il: "dal", lo: "dallo", la: "dalla", i: "dai", gli: "dagli", le: "dalle", "l'": "dall'" },
    di: { il: "del", lo: "dello", la: "della", i: "dei", gli: "degli", le: "delle", "l'": "dell'" },
    su: { il: "sul", lo: "sullo", la: "sulla", i: "sui", gli: "sugli", le: "sulle", "l'": "sull'" },
  };
  let out = s;
  for (const [prep, arts] of Object.entries(map)) {
    for (const [art, merged] of Object.entries(arts)) {
      out = out.replace(new RegExp(`\\b${prep} ${art}\\b`, "g"), merged);
    }
  }
  // apostrofi: «quell' uomo» → «quell'uomo», «l' isola» → «l'isola»
  out = out.replace(/('\s+)(?=[a-zàèéìòù])/gi, "'");
  return out;
}

/* ======================================================================
   API pubblica
   ====================================================================== */

export interface GlossToken {
  word: string;
  isPunct?: boolean;
  analysis?: TokenAnalysis | null;
}

/**
 * Traduce una frase (gruppo di token già analizzati) in italiano.
 * Restituisce una riga di testo leggibile.
 */
const COPULA_END = new Set([
  "è", "era", "ero", "erano", "eravamo", "eravate", "sei", "siamo", "siete",
  "sono", "sarò", "sarai", "sarà", "saremo", "sarete", "saranno", "fu",
  "fui", "fosti", "fummo", "foste", "furono", "è stato", "è stata",
  "è stato", "sono stati", "sono state", "erano stati", "sarà stato",
]);

/** Copula pura (esattamente la forma, non «è amata»). */
const PURE_COPULA = /^(è|era|ero|erano|eravamo|eravate|sei|siamo|siete|sono|sarò|sarai|sarà|saremo|sarete|saranno|fu|fui|fosti|fummo|foste|furono)$/;

/** Pronomi atoni + «non»: proteggono l'ordine tra soggetto e verbo. */
const ATONE_PRON = new Set(["mi", "ti", "si", "ci", "vi", "lo", "la", "li", "le", "gli", "ne", "non"]);

/** Congiunzioni subordinanti (testo italiano reso) che aprono un segmento sintattico. */
const SUBORD_WORDS = new Set([
  "affinché", "mentre", "dopo che", "prima che", "poiché", "quando",
  "se", "finché", "perché", "appena", "dove", "che", "sebbene",
]);

/** Subordinanti che, a inizio frase, richiedono la virgola dopo la subordinata. */
const SUBORD_COMMA = new Set([
  "mentre", "dopo che", "prima che", "poiché", "quando", "se", "finché",
  "appena", "dove", "sebbene", "perché", "affinché",
]);

const NUMERALS = new Set([
  "tre", "due", "sei", "sette", "otto", "nove", "dieci", "undici", "dodici",
  "tredici", "quattordici", "quindici", "sedici", "diciassette", "diciotto",
  "diciannove", "venti", "trenta", "quaranta", "cinquanta", "sessanta",
  "settanta", "ottanta", "novanta", "cento", "mille",
]);

type Part = { t: string; pos?: string; case?: string; num?: string };

export function glossToItalian(tokens: GlossToken[]): string {
  const parts: Part[] = [];

  // token utili per lookahead (la punteggiatura delimita le proposizioni)
  const useful: { t: GlossToken; opt?: AnalysisOption | null; norm: string }[] = [];
  for (const tk of tokens) {
    if (tk.isPunct) {
      useful.push({ t: tk, opt: null, norm: tk.word.toLowerCase() });
      continue;
    }
    const o = tk.analysis?.options[tk.analysis.selected] ?? null;
    // punteggiatura attaccata alla parola («pugnant,» → «pugnant» + virgola)
    const trailing = (tk as { trailing?: string }).trailing ?? "";
    const pm = tk.word.match(/^(.*?)([,.!?…;]+)$/);
    const baseWord = trailing ? tk.word : pm && pm[1].length > 0 ? pm[1] : tk.word;
    const trail = trailing || (pm && pm[1].length > 0 ? pm[2] : "");
    useful.push({ t: { ...tk, word: baseWord }, opt: o, norm: baseWord.toLowerCase() });
    if (trail && /^[,.!?…;]+$/.test(trail)) {
      useful.push({ t: { word: trail, isPunct: true }, opt: null, norm: trail.toLowerCase() });
    }
  }

  // True se è una forma del verbo essere (lemma sum / esse)
  const isEsse = (o: AnalysisOption | null | undefined): boolean => {
    if (!o || o.pos !== "verbo") return false;
    const k = lemmaKey(o.lemma);
    return k === "sum" || k === "esse" || k === "fui";
  };

  // C'è un verbo al congiuntivo dopo l'indice from? (per cum/ut/ne/quod)
  const hasCongiuntivoAhead = (from: number): boolean => {
    for (let j = from + 1; j < useful.length; j++) {
      const o = useful[j].opt;
      if (o && o.pos === "verbo" && o.mood === "congiuntivo") return true;
      if (o && o.pos === "verbo" && (o.mood === "indicativo" || o.mood === "imperativo")) return false;
    }
    return false;
  };

  // C'è un complemento d'agente «a/ab + ablativo» prima del verbo? (passivo deponente)
  const hasAgent = (): boolean =>
    useful.some(
      (u) =>
        (u.norm === "a" || u.norm === "ab") &&
        u.opt?.pos === "preposizione"
    );

  // genere del soggetto: il primo nome/pronome con genere noto (per il passivo)
  let subjectGender: string | undefined;
  for (const u of useful) {
    const o = u.opt;
    if (o && (o.pos === "nome" || o.pos === "pronome") && o.gender) {
      subjectGender = o.gender;
      break;
    }
  }

  const skip = new Set<number>();
  // cum historicum: dopo «cum + congiuntivo» i verbi si rendono all'indicativo
  let cumClause = false;

  /* ---------- impersonali genitivali: «Me taedet vitae» → «Sono stanco della vita» ---------- */
  const genImpMap = new Map<number, string>();
  {
    const GEN_IMPERS: Record<string, { out: string[] }> = {
      taedet: { out: ["sono stanco", "sei stanco", "è stanco", "siamo stanchi", "siete stanchi", "sono stanchi"] },
      pudet: { out: ["mi vergogno", "ti vergogni", "si vergogna", "ci vergogniamo", "vi vergognate", "si vergognano"] },
      paenitet: { out: ["mi pento", "ti penti", "si pente", "ci pentiamo", "vi pentite", "si pentono"] },
      piget: { out: ["mi dispiace", "ti dispiace", "gli dispiace", "ci dispiace", "vi dispiace", "loro dispiace"] },
      miseret: { out: ["ho pietà", "hai pietà", "ha pietà", "abbiamo pietà", "avete pietà", "hanno pietà"] },
    };
    for (let i = 0; i < useful.length; i++) {
      const o = useful[i].opt;
      if (!o || o.pos !== "verbo" || !GEN_IMPERS[useful[i].norm]) continue;
      // pronome accusativo prima (me/te/nos/vos) → persona
      let pers = 2;
      const pron = i > 0 ? useful[i - 1].norm : "";
      if (pron === "me") pers = 0;
      else if (pron === "te") pers = 1;
      else if (pron === "nos") pers = 3;
      else if (pron === "vos") pers = 4;
      // nome dopo → oggetto (genitivo/ablativo)
      let nounOpt: AnalysisOption | null = null;
      let nounIdx = -1;
      for (let j = i + 1; j < useful.length; j++) {
        const oj = useful[j].opt;
        if (!oj) continue;
        if (oj.pos === "nome" || oj.pos === "aggettivo") { nounOpt = oj; nounIdx = j; break; }
        if (oj.pos === "verbo") break;
      }
      if (!nounOpt) continue;
      const base = firstMeaning(nounOpt.translation || "") || nounOpt.lemma || useful[nounIdx].norm;
      // «vita, vitae» → «vita»; toglie anche l'eventuale prima parola («la vita» → «vita»)
      const baseClean = (base.split(",")[0] ?? base)
        .trim()
        .replace(/^[a-zàèéìòù]+\s+/, "");
      const g2 = nounOpt.gender;
      // «vitae» può essere letto come nominativo plurale: per i genitivali vale il singolare
      const lemmaParts = (nounOpt.lemma || "").split(",").map((s) => s.trim());
      const plu =
        nounOpt.number === "plurale" &&
        !(lemmaParts.length >= 2 && /ae$/.test(lemmaParts[1] ?? ""));
      const art = plu
        ? g2 === "femminile" ? "delle " : "dei "
        : g2 === "femminile" ? "della " : /^[aeiouàèéìòù]/i.test(baseClean) ? "dell'" : "del ";
      const obj = `${art}${baseClean}`.replace(/\s+/g, " ").trim();
      if (pron && i > 0) skip.add(i - 1);
      skip.add(nounIdx);
      genImpMap.set(i, `${GEN_IMPERS[useful[i].norm].out[pers]} ${obj}`);
    }
  }

  for (let i = 0; i < useful.length; i++) {
    if (skip.has(i)) continue;
    const { t, opt, norm } = useful[i];
    // punteggiatura: delimita le proposizioni (la virgola serve al riordino SOV)
    if (t.isPunct) {
      parts.push({ t: t.word, pos: "punct" });
      cumClause = false;
      continue;
    }
    if (!opt) {
      parts.push({ t: t.word });
      continue;
    }

    /* ---------- ABLATIVO ASSOLUTO: nome/agg in ablativo + participio perfetto passivo ---------- */
    if (
      (opt.pos === "nome" || opt.pos === "aggettivo") &&
      opt.case === "ablativo" &&
      i + 1 < useful.length
    ) {
      // cerca tra le opzioni del token successivo il participio perfetto passivo in ablativo
      const nextTok = useful[i + 1].t;
      const nxOpts = nextTok.analysis?.options ?? [];
      const nx = nxOpts.find(
        (o) =>
          o.pos === "verbo" &&
          o.mood === "participio" &&
          o.tense === "perfetto" &&
          o.voice === "passivo" &&
          o.case === "ablativo" &&
          (o.gender ?? "") === (opt.gender ?? "") &&
          (o.number ?? "") === (opt.number ?? "")
      );
      if (nx) {
        const nome = nounGloss(firstMeaning(opt.translation || "") || opt.lemma || t.word, opt);
        const part = agreePart(partPassato(verbInfinitive(nx)), nx.gender, nx.number);
        // «Urbe capta» → «Presa la città» (participio prima, nome dopo)
        parts.push({ t: `${cap(part)} ${nome}`, pos: "ablativo" });
        // virgola dopo l'ablativo assoluto se la frase continua
        if (i + 2 < useful.length) parts.push({ t: ",", pos: "punct" });
        skip.add(i + 1);
        continue;
      }
    }

    /* ---------- congiunzioni contestuali ---------- */
    if (norm === "cum") {
      const c = hasCongiuntivoAhead(i);
      parts.push({ t: c ? "quando" : "con", pos: opt.pos });
      cumClause = c;
      continue;
    }
    if (norm === "ut") {
      parts.push({ t: hasCongiuntivoAhead(i) ? "affinché" : "quando", pos: opt.pos });
      continue;
    }
    if (norm === "ne") {
      // «non» separato così il riordino lo mette davanti al verbo
      parts.push({ t: hasCongiuntivoAhead(i) ? "affinché" : "né", pos: opt.pos });
      if (hasCongiuntivoAhead(i)) parts.push({ t: "non", pos: "avverbio" });
      continue;
    }
    if (norm === "quod") {
      const cong = hasCongiuntivoAhead(i);
      parts.push({ t: cong ? "che" : "poiché", pos: opt.pos });
      continue;
    }
    if (norm === "dum") {
      parts.push({ t: "mentre", pos: opt.pos });
      continue;
    }
    if (norm === "ubi") {
      // ubi temporale → «quando» (nelle versioni scolastiche è il senso prevalente)
      parts.push({ t: "quando", pos: opt.pos });
      continue;
    }
    // parole di servizio (FUNCTION_WORDS)
    const fw = FUNCTION_WORDS[norm];
    if (fw) {
      parts.push({ t: fw, pos: opt.pos });
      continue;
    }
    // pronomi personali atoni (mihi → mi, tibi → ti…)
    const DATIVO_ATONO: Record<string, string> = {
      mihi: "mi", tibi: "ti", sibi: "si", nobis: "ci", vobis: "vi",
      ei: "gli", eis: "loro", illi: "gli", illis: "loro",
    };
    // DATIVO DI POSSESSO: «mihi est liber» → «ho un libro»
    if (DATIVO_ATONO[norm] && opt.case === "dativo" && i + 1 < useful.length) {
      const nx = useful[i + 1].opt;
      if (nx && isEsse(nx)) {
        const POSS: Record<string, string[]> = {
          mihi: ["ho", "avevo", "ebbi", "avrò"],
          tibi: ["hai", "avevi", "avesti", "avrai"],
          sibi: ["ha", "aveva", "ebbe", "avrà"],
          nobis: ["abbiamo", "avevamo", "avemmo", "avremo"],
          vobis: ["avete", "avevate", "aveste", "avrete"],
        };
        const idxP = nx.tense === "perfetto" ? 2 : nx.tense === "imperfetto" ? 1 : nx.tense === "futuro" ? 3 : 0;
        parts.push({ t: POSS[norm]?.[idxP] ?? "ha", pos: "verbo" });
        skip.add(i + 1);
        continue;
      }
    }
    if (DATIVO_ATONO[norm] && opt.case === "dativo") {
      parts.push({ t: DATIVO_ATONO[norm], pos: opt.pos });
      continue;
    }
    // accusativi atoni dei pronomi personali («te» → «ti»)
    const ACC_ATONE: Record<string, string> = {
      me: "mi", te: "ti", nos: "ci", vos: "vi",
      eum: "lo", eam: "la", id: "lo", eos: "li", eas: "le",
    };
    if (ACC_ATONE[norm] && opt.pos === "pronome") {
      const isAcc = opt.case === "accusativo";
      // «te» è spesso analizzato come ablativo: atono se non c'è una preposizione
      const isAblNoPrep =
        opt.case === "ablativo" && !(i > 0 && useful[i - 1].opt?.pos === "preposizione");
      if (isAcc || isAblNoPrep) {
        parts.push({ t: ACC_ATONE[norm], pos: opt.pos });
        continue;
      }
    }
    // doppio dativo: «mihi curae est» → «mi sta a cuore»
    if (norm === "curae" && i + 1 < useful.length) {
      const nx = useful[i + 1].opt;
      if (nx && isEsse(nx) && parts.length > 0 && parts[parts.length - 1].pos === "pronome") {
        parts.push({ t: nx.tense === "imperfetto" ? "stava a cuore" : "sta a cuore", pos: "verbo" });
        skip.add(i + 1);
        continue;
      }
    }
    // pronome riflessivo «se» nel discorso indiretto → «che»
    if (norm === "se" && i + 1 < useful.length) {
      const hasFut = useful
        .slice(i + 1)
        .some(
          (u) =>
            u.opt?.pos === "verbo" &&
            u.opt.mood === "participio" &&
            u.opt.tense === "futuro"
        );
      if (hasFut) {
        parts.push({ t: "che", pos: opt.pos });
        continue;
      }
    }

    /* ---------- VERBI: costruzioni particolari ---------- */
    if (opt.pos === "verbo") {
      // impersonali genitivali già risolti («Me taedet vitae» → «Sono stanco della vita»)
      if (genImpMap.has(i)) {
        parts.push({ t: genImpMap.get(i)!, pos: "verbo" });
        continue;
      }
      // VERBI IMPERSONALI (opertet, licet, decet, taedet…)
      const IMPERS: Record<string, { out: string; kind: "acc" | "gen" | "inf" }> = {
        oportet: { out: "bisogna che", kind: "acc" },
        licet: { out: "è lecito", kind: "inf" },
        decet: { out: "conviene", kind: "acc" },
        taedet: { out: "sono stanco di", kind: "gen" },
        pudet: { out: "mi vergogno di", kind: "gen" },
        paenitet: { out: "mi pento di", kind: "gen" },
        piget: { out: "mi dispiace di", kind: "gen" },
        miseret: { out: "ho pietà di", kind: "gen" },
      };
      const imp = IMPERS[norm];
      if (imp) {
        if (norm === "oportet") {
          // oportet + accusativo + infinito → «bisogna che + congiuntivo»
          const PRON_NOM: Record<string, [number, "singolare" | "plurale"]> = {
            me: [1, "singolare"], te: [2, "singolare"], se: [3, "singolare"],
            nos: [1, "plurale"], vos: [2, "plurale"], eum: [3, "singolare"],
            eam: [3, "singolare"], eos: [3, "plurale"], eas: [3, "plurale"],
          };
          const PRON_TXT: Record<string, string> = {
            me: "io", te: "tu", se: "egli", nos: "noi", vos: "voi",
            eum: "egli", eam: "ella", eos: "essi", eas: "esse",
          };
          let pers = 3;
          let num: "singolare" | "plurale" = "singolare";
          let pronTxt = "";
          let infOpt: AnalysisOption | null = null;
          for (let j = i + 1; j < useful.length; j++) {
            const oj = useful[j].opt;
            if (!oj) continue;
            if (oj.pos === "verbo" && oj.mood === "infinito") {
              infOpt = oj;
              skip.add(j);
              continue;
            }
            if (oj.pos === "verbo" && oj.mood !== "infinito" && oj.mood !== "participio") break;
            // «oportet» regge l'accusativo: il pronome (anche se Whitaker lo dà al nominativo)
            if (oj.pos === "pronome" && PRON_NOM[useful[j].norm] && !pronTxt) {
              const p = PRON_NOM[useful[j].norm];
              if (p) {
                pers = p[0];
                num = p[1];
              }
              pronTxt = PRON_TXT[useful[j].norm] ?? "egli";
              skip.add(j);
            }
          }
          const inf = infOpt
            ? conjugateVerb(
                verbInfinitive(infOpt),
                { ...infOpt, mood: "congiuntivo", tense: "presente", person: pers as 1 | 2 | 3, number: num },
                subjectGender
              )
            : "agire";
          parts.push({ t: `bisogna che ${pronTxt} ${inf}`.replace(/\s+/g, " ").trim(), pos: "verbo" });
        } else if (norm === "decet") {
          // «Pueros decet studere» → «Ai bambini conviene studiare»
          if (parts.length > 0 && parts[parts.length - 1].pos !== "verbo") {
            parts[parts.length - 1].t = `a ${parts[parts.length - 1].t}`;
          }
          parts.push({ t: imp.out, pos: "verbo" });
        } else {
          const tns = opt.tense;
          const aux = tns === "imperfetto" ? "era" : tns === "perfetto" ? "fu" : tns === "futuro" ? "sarà" : "è";
          parts.push({ t: imp.out.replace("è lecito", aux + " lecito"), pos: "verbo" });
        }
        continue;
      }

      // SUPINO: «dictu» → «a dirsi» (facile a dirsi)
      if (opt.mood === "supino") {
        if (norm === "natu") {
          parts.push({ t: "per nascita", pos: "verbo" });
        } else {
          const inf = verbInfinitive(opt);
          parts.push({ t: `a ${inf.replace(/e$/, "si")}`, pos: "verbo" });
        }
        continue;
      }

      // GERUNDIVO + essere → perifrastica passiva («delenda est» → «deve essere distrutta»)
      if (opt.mood === "gerundivo") {
        const inf = verbInfinitive(opt);
        const part = agreePart(partPassato(inf), opt.gender, opt.number);
        const nx = i + 1 < useful.length ? useful[i + 1].opt : null;
        if (nx && isEsse(nx)) {
          parts.push({ t: `deve essere ${part}`, pos: "verbo" });
          skip.add(i + 1);
        } else {
          parts.push({ t: `da ${inf}`, pos: "verbo" });
        }
        continue;
      }

      // PARTICIPIO FUTURO + esse: infinitiva («venturum esse» → «sarebbe venuto»)
      // oppure perifrastica attiva («dicturus est» → «sta per dire»)
      if (opt.mood === "participio" && opt.tense === "futuro" && opt.voice === "attivo") {
        const nx = i + 1 < useful.length ? useful[i + 1].opt : null;
        if (nx && isEsse(nx)) {
          if (nx.mood === "infinito") {
            const part = agreePart(partPassato(verbInfinitive(opt)), opt.gender, opt.number);
            parts.push({ t: `sarebbe ${part}`, pos: "verbo" });
          } else {
            // perifrastica attiva: il participio futuro è predicato di «est/erat»
            const inf = verbInfinitive(opt);
            parts.push({ t: `${nx.tense === "imperfetto" ? "stava" : "sta"} per ${inf}`, pos: "verbo" });
          }
          skip.add(i + 1);
          continue;
        }
        parts.push({ t: `stava per ${verbInfinitive(opt)}`, pos: "verbo" });
        continue;
      }

      // PARTICIPIO PERFETTO (passivo o deponente) + essere → perfetto
      if (opt.mood === "participio" && opt.tense === "perfetto") {
        const nx = i + 1 < useful.length ? useful[i + 1].opt : null;
        const inf = verbInfinitive(opt);
        if (nx && isEsse(nx)) {
          const dep = isDeponent(opt.lemma);
          if (dep) {
            // deponente: «profectus est» → «partì», «laetati sunt» → «si rallegrarono»
            // (se c'è un agente «a/ab + ablativo» la resa è passiva: «furono esortati»)
            const idx = personIdx(nx.person, nx.number);
            if (hasAgent()) {
              const part = agreePart(partPassato(inf), opt.gender, opt.number);
              parts.push({ t: `${["fui", "fosti", "fu", "fummo", "foste", "furono"][idx] ?? "fu"} ${part}`, pos: "verbo" });
            } else {
              parts.push({ t: passatoRemoto(inf, idx) ?? `${["fui", "fosti", "fu", "fummo", "foste", "furono"][idx] ?? "fu"} ${partPassato(inf)}`, pos: "verbo" });
            }
          } else {
            // passivo: «missus est» → «fu mandato»
            const idx = personIdx(nx.person, nx.number);
            const part = agreePart(partPassato(inf), opt.gender, opt.number);
            parts.push({ t: `${["fui", "fosti", "fu", "fummo", "foste", "furono"][idx] ?? "fu"} ${part}`, pos: "verbo" });
          }
          skip.add(i + 1);
          continue;
        }
        // participio perfetto isolato (senza essere): accordato
        parts.push({ t: agreePart(partPassato(inf), opt.gender, opt.number), pos: "verbo" });
        continue;
      }

      // cum historicum: il congiuntivo si rende all'indicativo («venisset» → «venne»)
      if (opt.mood === "congiuntivo" && cumClause) {
        const t2 = opt.tense === "piuccheperfetto" ? "perfetto" : opt.tense === "imperfetto" ? "imperfetto" : opt.tense;
        const v2: AnalysisOption = { ...opt, mood: "indicativo", tense: t2 };
        parts.push({ t: conjugateVerb(verbInfinitive(opt), v2, subjectGender), pos: "verbo" });
        cumClause = false;
        continue;
      }

      // VERBO FINITO / INFINITO
      const infV = verbInfinitive(opt);
      const conj = conjugateVerb(infV, opt, subjectGender);
      parts.push({ t: conj, pos: "verbo" });
      // un verbo all'indicativo/imperativo chiude la cum-clause
      if (opt.mood === "indicativo" || opt.mood === "imperativo") cumClause = false;
      continue;
    }

    /* ---------- NOMI, AGGETTIVI, PRONOMI, ALTRO ---------- */
    const gloss = firstMeaning(opt.translation || "");
    let out: string;
    let outPos: string | undefined;
    switch (opt.pos) {
      case "nome":
        out = nounGloss(gloss || opt.lemma || t.word, opt);
        // complemento di specificazione: «militum» → «dei soldati»
        if (opt.case === "genitivo") out = genitiveGloss(out, opt);
        // vocativo: niente articolo («Pueri, ludite» → «Bambini, giocate»)
        if (opt.case === "vocativo") out = out.replace(/^(l'|la |il |lo |le |i |gli )/i, "");
        break;
      case "aggettivo":
      case "pronome":
      case "numerale": {
        // possessivi «suus/sua/suum»: accordo con il nome che segue
        const lk = lemmaKey(opt.lemma);
        if (lk === "suus" || lk === "suum" || lk === "sui" || /^su[aeio]s?$/.test(norm)) {
          let g = opt.gender;
          let n = opt.number;
          for (let j = i + 1; j < useful.length; j++) {
            const nj = useful[j].opt;
            if (nj && (nj.pos === "nome" || nj.pos === "aggettivo") && nj.gender) {
              g = nj.gender;
              n = nj.number;
              break;
            }
          }
          const poss =
            n === "plurale"
              ? g === "femminile"
                ? "sue"
                : "suoi"
              : g === "femminile"
                ? "sua"
                : "suo";
          // riordino: il possessivo va PRIMA del nome («casa sua» → «sua casa»)
          if (parts.length > 0 && parts[parts.length - 1].pos === "nome") {
            const prev = parts.pop()!;
            parts.push({ t: poss, pos: "aggettivo" });
            parts.push(prev);
          } else {
            parts.push({ t: poss, pos: "aggettivo" });
          }
          continue;
        }
        // «maior natu» → «più anziano»
        if (norm === "maior" && i + 1 < useful.length && useful[i + 1].norm === "natu") {
          parts.push({ t: "più anziano", pos: "aggettivo" });
          skip.add(i + 1);
          continue;
        }
        out = adjGloss(gloss || opt.lemma || t.word, opt, subjectGender);
        // genitivo di un aggettivo/pronome: «omnium» → «di tutti»
        if (opt.case === "genitivo") out = `di ${out}`;
        break;
      }
      default:
        out = gloss || opt.lemma || t.word;
    }
    // «gratias agere» → «ringraziare» (locuzione)
    if (norm === "gratias") {
      for (let j = i + 1; j < useful.length; j++) {
        const oj = useful[j].opt;
        if (!oj || oj.pos !== "verbo") continue;
        const ag = lemmaKey(oj.lemma);
        if (ag === "ago" || ag === "agere") {
          const conj = conjugateVerb("ringraziare", oj, subjectGender);
          out = conj;
          outPos = "verbo";
          skip.add(j);
          break;
        }
        break;
      }
    }
    // toglie le parentesi di servizio («Vesontio (città dei Sequani)» → «Vesontio»)
    out = out.replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();
    parts.push({ t: out, pos: outPos ?? opt.pos, case: opt.case, num: opt.number });
  }

  /* ---------- regola modale/piacere + infinito: «vuole questo fare» → «vuole fare questo» ---------- */
  {
    const MODALI = new Set(["può", "puoi", "posso", "possiamo", "potete", "possono", "vuole", "vuoi", "voglio", "vogliamo", "volete", "vogliono", "deve", "devo", "devi", "dobbiamo", "dovete", "devono", "piace", "piacciono", "sa", "so", "sai", "sappiamo", "sapete", "sanno"]);
    const isInf = (s: string): boolean => /(are|ere|ire)$/.test(s) || /^(essere|avere) /.test(s) || /^(essere|avere)$/.test(s);
    const modalHead = (p: Part): string => {
      const h = p.t.startsWith("non ") ? p.t.slice(4) : p.t;
      return h.split(" ")[0] ?? "";
    };
    if (process.env.DEBUG_PARTS) console.log("MODAL in:", JSON.stringify(parts.map((p) => p.t)));
    // pattern [infinito] [non] [modale] → [non] [modale] [infinito] («essere fatto non può»)
    for (let i = 1; i < parts.length - 1; i++) {
      if (process.env.DEBUG_PARTS) console.log("MODAL check", i, JSON.stringify(parts.map((p) => p.t)), "cond=", parts[i].pos === "verbo" && parts[i + 1].t === "non" && !!parts[i + 2] && parts[i + 2].pos === "verbo" && MODALI.has(modalHead(parts[i + 2])));
      if (
        parts[i].pos === "verbo" &&
        parts[i + 1].t === "non" &&
        parts[i + 2] &&
        parts[i + 2].pos === "verbo" &&
        MODALI.has(modalHead(parts[i + 2]))
      ) {
        // «essere fatto non può» → «non può essere fatto»
        const inf = parts.splice(i, 1)[0];
        const nn = parts.splice(i, 1)[0]; // «non»
        parts.splice(i, 0, nn);
        parts.splice(i + 2, 0, inf);
      }
    }
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (p.pos === "verbo" && MODALI.has(modalHead(p))) {
        // trova un infinito dopo (pos verbo, forma non coniugata) — di solito l'ultimo
        for (let j = i + 1; j < parts.length; j++) {
          if (parts[j].pos === "verbo" && isInf(parts[j].t)) {
            const inf = parts.splice(j, 1)[0];
            // inserisci dopo il modale e dopo eventuale «non» («non può essere fatto»)
            let at = i + 1;
            while (at < parts.length && parts[at].t === "non") at++;
            parts.splice(at, 0, inf);
            break;
          }
        }
      }
    }
  }
  if (process.env.DEBUG_PARTS) console.log("MODAL out:", JSON.stringify(parts.map((p) => p.t)));

  /* ---------- «non» staccato dal verbo («Questo può essere fatto non») → davanti al verbo ---------- */
  {
    for (let k = parts.length - 1; k >= 0; k--) {
      if (parts[k].t !== "non") continue;
      const vIdx = (() => {
        for (let v = k - 1; v >= 0; v--) {
          if (parts[v].pos === "verbo") return v;
          // «non» della subordinata (dopo affinché/che/…): non spostarlo nella principale
          if (SUBORD_WORDS.has(parts[v].t)) return -1;
        }
        return -1;
      })();
      if (process.env.DEBUG_PARTS) console.log("NONFIX k=", k, "vIdx=", vIdx, JSON.stringify(parts.map((p) => `${p.t}[${p.pos}]`)));
      if (vIdx >= 0) {
        const nn = parts.splice(k, 1)[0];
        parts.splice(vIdx, 0, nn);
        k = parts.length;
      }
    }
  }

  if (process.env.DEBUG_PARTS) console.log("NONFIX out:", JSON.stringify(parts.map((p) => p.t)));

  /* ---------- «è lecito mi restare» → «mi è lecito restare» (impersonale + dativo atono) ---------- */
  {
    for (let k = 0; k < parts.length - 1; k++) {
      if (/^(è|era|fu|sarà) lecito$/.test(parts[k].t) && ATONE_PRON.has(parts[k + 1].t)) {
        const pr = parts.splice(k + 1, 1)[0];
        parts.splice(k, 0, pr);
        break;
      }
    }
  }

  /* ---------- dimostrativi + nome: «Questo il libro» → «Questo libro» ---------- */
  {
    const DEM = new Set(["questo", "questa", "questi", "queste", "quello", "quella", "quelli", "quelle", "quel"]);
    for (let k = 0; k < parts.length - 1; k++) {
      const d = parts[k].t.toLowerCase();
      if (!DEM.has(d) || parts[k + 1].pos !== "nome") continue;
      const m = parts[k + 1].t.match(/^(l'|la |il |lo |le |i |gli )(.*)$/i);
      if (!m) continue;
      let dem = parts[k].t;
      const noun = m[2];
      if (/^[aeiouàèéìòù]/i.test(noun)) {
        if (/^quest[oa]$/i.test(dem)) dem = dem.replace(/[oa]$/, "'"); // questo → quest'
        else if (/^quell[oa]$/i.test(dem)) dem = dem.replace(/[oa]$/, "'"); // quello → quell'
      } else if (d === "quello") {
        dem = "quel";
      }
      parts[k + 1] = { ...parts[k + 1], t: `${dem} ${noun}`.replace(/\s+/g, " ").trim() };
      parts.splice(k, 1);
      k--;
    }
  }

  /* ---------- riordino SOV dentro ogni segmento sintattico ---------- */
  {
    const fin = (p: Part): boolean => {
      const w = p.t.split(" ")[0] ?? "";
      if (p.pos !== "verbo") return false;
      if (/(are|ere|ire)$/.test(p.t)) return false; // infiniti
      if (/^essere\s+/.test(p.t)) return false; // infinito passivo («essere fatto»)
      if (/^(sarebbe|sarebbero|sarei|saresti|saremmo|sareste)$/.test(w)) return false;
      if (/^(stato|stata|stati|state)$/.test(w)) return false;
      return true;
    };

    // 1) dividi in segmenti: subordinanti e virgole aprono un nuovo segmento
    const segments: Part[][] = [];
    let cur: Part[] = [];
    for (const p of parts) {
      if (p.pos === "punct" && p.t === ",") {
        if (cur.length > 0) segments.push(cur);
        segments.push([p]);
        cur = [];
        continue;
      }
      if (SUBORD_WORDS.has(p.t) && cur.length > 0) {
        segments.push(cur);
        cur = [];
      }
      cur.push(p);
    }
    if (cur.length > 0) segments.push(cur);

    // 2) riordina dentro ogni segmento
    for (const seg of segments) {
      if (seg.length < 2) continue;
      const lastIdx = seg.length - 1;
      // soggetto: primo nominale al nominativo (con eventuale aggettivo attaccato)
      let subjIdx = seg.findIndex((p) => p.pos === "nome" && p.case === "nominativo");
      if (subjIdx < 0) subjIdx = seg.findIndex((p) => p.pos === "pronome" && p.case === "nominativo");
      if (subjIdx < 0) subjIdx = seg.findIndex((p) => p.pos === "aggettivo" && p.case === "nominativo");
      if (!fin(seg[lastIdx])) continue;
      if (seg.some((p) => p.case === "vocativo")) continue;
      // due verbi finiti nello stesso segmento (reggente + infinitiva «disse … fu vinti»):
      // l'ordine è ambiguo, meglio lasciare l'ordine dei token
      let prevFin = 0;
      for (let q = 0; q < lastIdx; q++) if (fin(seg[q])) prevFin++;
      if (prevFin > 0) continue;
      if (subjIdx >= 0) {
        // il pronome relativo «che» non è il soggetto della reggente
        if (seg[subjIdx].t === "che") continue;
        let subjEnd = subjIdx + 1;
        if (subjEnd < seg.length && seg[subjEnd].pos === "aggettivo" && seg[subjEnd].case === "nominativo") subjEnd++;
        // «Molti dei soldati morirono»: il genitivo partitivo fa parte del soggetto
        if (subjEnd < seg.length && seg[subjEnd].case === "genitivo") subjEnd++;
        // proteggi pronomi atoni e «non» tra soggetto e verbo («Io ti amo», «Cesare non vince»)
        const between = seg.slice(subjEnd, lastIdx);
        if (between.some((p) => ATONE_PRON.has(p.t))) continue;
        const v = seg.splice(lastIdx, 1)[0];
        seg.splice(subjEnd, 0, v);
        // «non» della subordinata subito prima del verbo («affinché i nemici non entrassero»)
        const vi = seg.indexOf(v);
        const ni = seg.findIndex((p, idx) => p.t === "non" && idx < vi);
        if (ni >= 0) {
          const nn = seg.splice(ni, 1)[0];
          seg.splice(vi - 1, 0, nn);
        }
      } else {
        // nessun soggetto esplicito: verbo finito in testa al segmento,
        // ma DOPO l'eventuale congiunzione subordinante («affinché difendano la patria»)
        if (PURE_COPULA.test(seg[lastIdx].t)) continue; // «… vero è» → lo gestisce la copula-end
        // pronome atono in testa («Ti ringrazio», «Mi piace»): il verbo resta dopo
        if (seg.length > 0 && ATONE_PRON.has(seg[0].t)) continue;
        // subordinata con verbo proprio già presente («che combatterono furono vinti»):
        // spostare l'ultimo verbo romperebbe la relativa, quindi si lascia com'è
        if (SUBORD_WORDS.has(seg[0]?.t ?? "")) {
          let prevFin = 0;
          for (let q = 0; q < lastIdx; q++) if (fin(seg[q])) prevFin++;
          if (prevFin > 0) continue;
        }
        const startIdx = SUBORD_WORDS.has(seg[0]?.t ?? "") ? 1 : 0;
        const v = seg.splice(lastIdx, 1)[0];
        seg.splice(startIdx, 0, v);
      }
    }

    // 3) ricompatta (la virgola è già un segmento; aggiungila se manca dopo la subordinata)
    const rebuilt: Part[] = [];
    segments.forEach((seg, si) => {
      if (si === 1 && segments.length >= 2 && SUBORD_COMMA.has(segments[0][0]?.t ?? "")) {
        const already = seg.length === 1 && seg[0].pos === "punct" && seg[0].t === ",";
        if (!already) rebuilt.push({ t: ",", pos: "punct" });
      }
      rebuilt.push(...seg);
    });
    parts.splice(0, parts.length, ...rebuilt);
  }
  if (process.env.DEBUG_PARTS) console.log("SOV out:", JSON.stringify(parts.map((p) => p.t)));

  /* ---------- superlativo: il nome precede l'aggettivo («Maximus fluvius» → «Il fiume è grandissimo») ---------- */
  {
    const SUPER_FORMS = /(issimo|issima|issimi|issime|ottimo|ottima|pessimo|pessima|massimo|massima|minimo|minima|sommo|somma|supremo|suprema|estremo|estrema|infimo|infima)$/;
    for (let k = 0; k < parts.length - 1; k++) {
      if (
        parts[k].pos === "aggettivo" &&
        parts[k + 1].pos === "nome" &&
        SUPER_FORMS.test(parts[k].t)
      ) {
        const tmp = parts[k];
        parts[k] = parts[k + 1];
        parts[k + 1] = tmp;
        k++;
      }
    }
  }

  /* ---------- possessivi davanti a nome articolato: «sue le truppe» → «le sue truppe» ---------- */
  {
    const POSSESSIVI = new Set([
      "mio", "mia", "miei", "mie", "tuo", "tua", "tuoi", "tue", "suo", "sua",
      "suoi", "sue", "nostro", "nostra", "nostri", "nostre", "vostro", "vostra",
      "vostri", "vostre", "proprio", "propria", "propri", "proprie",
    ]);
    for (let k = 0; k < parts.length - 1; k++) {
      if (POSSESSIVI.has(parts[k].t) && parts[k + 1].pos === "nome") {
        const m = parts[k + 1].t.match(/^(l'|la |il |lo |le |i |gli |un |una )(.+)$/i);
        if (m) {
          parts[k + 1].t = `${m[1]}${parts[k].t} ${m[2]}`;
          parts.splice(k, 1);
          k--;
        }
      }
    }
  }

  /* ---------- infinitiva: «Dico Caesarem venire» → «Dico che Cesare viene» ---------- */
  {
    const DICENDI = new Set([
      "dico", "dice", "disse", "diceva", "dicono", "dissero", "dirà", "penso", "pensa",
      "pensò", "credo", "crede", "credeva", "so", "sa", "sapeva", "vedo", "vede",
      "vide", "vedeva", "sento", "sente", "senteva", "udì", "iubeo", "ordino",
      "ordina", "voglio", "vuole", "voleva", "desidero", "desidera", "spero", "spera",
      "narro", "narra", "scrivo", "scrive", "rispondo", "risponde", "nego", "nega",
      "affermo", "afferma", "dimostro", "dimostra", "insegno", "insegna", "mostro",
      "mostra", "intendo", "intende", "ascolto", "ascolta", "audio", "riferisco", "riferisce",
    ]);
    for (let k = 0; k < parts.length - 2; k++) {
      const head = parts[k].t.split(" ")[0] ?? "";
      if (parts[k].pos !== "verbo" || !DICENDI.has(head)) continue;
      for (let j = k + 1; j < parts.length - 1; j++) {
        const acc = parts[j];
        const inf = parts[j + 1];
        const isNominal = acc.pos === "nome" || acc.pos === "pronome";
        // infinitiva passiva: «hostes victos esse» → «che i nemici erano stati vinti»
        const passM =
          inf.pos === "verbo" ? inf.t.match(/^(fu|furono|fui|fosti|fummo|foste) (.+)$/) : null;
        if (isNominal && passM) {
          const part = passM[2];
          const plu = acc.num === "plurale";
          parts.splice(j + 1, 1, { t: (plu ? "erano stati " : "era stato ") + part, pos: "verbo" });
          parts.splice(j, 0, { t: "che", pos: "congiunzione" });
          break;
        }
        const isInf = inf.pos === "verbo" && /(are|ere|ire)$/.test(inf.t);
        if (!isNominal || !isInf) continue;
        const opt3: AnalysisOption = {
          lemma: inf.t, summary: "", translation: inf.t, form: "", pos: "verbo",
          mood: "indicativo", tense: "presente", person: 3,
          number: acc.num === "plurale" ? "plurale" : "singolare",
          freq: 1, desc: "", raw: "",
        };
        parts.splice(j + 1, 1, { t: conjugateVerb(inf.t, opt3, subjectGender), pos: "verbo" });
        parts.splice(j, 0, { t: "che", pos: "congiunzione" });
        break;
      }
    }
  }

  // «partes tres» → «le tre parti»: il numerale si inserisce dopo l'articolo
  if (parts.length >= 2) {
    const last = parts[parts.length - 1];
    const prev = parts[parts.length - 2];
    if (
      prev.pos === "nome" &&
      (last.pos === "numerale" || NUMERALS.has(last.t.toLowerCase()))
    ) {
      const num = last.t;
      const m = prev.t.match(/^(l'|la |il |lo |le |i |gli |un |una )(.+)$/i);
      prev.t = m ? `${m[1]}${num} ${m[2]}` : `${num} ${prev.t}`;
      parts.pop();
    }
  }

  if (process.env.DEBUG_PARTS) {
    console.log("PARTS:", JSON.stringify(parts.map((p) => ({ t: p.t, pos: p.pos, case: p.case }))));
  }

  /* ---------- «La ragazza che canta bella è» → «La ragazza che canta è bella» ---------- */
  {
    for (let k = 1; k < parts.length - 3; k++) {
      if (parts[k].t !== "che") continue;
      const v1 = parts[k + 1];
      const a2 = parts[k + 2];
      const c3 = parts[k + 3];
      if (
        v1.pos === "verbo" &&
        a2.pos === "aggettivo" &&
        c3.pos === "verbo" &&
        PURE_COPULA.test(c3.t)
      ) {
        parts[k + 2] = c3;
        parts[k + 3] = a2;
        break;
      }
    }
  }

  let line = parts
    .map((p) => p.t)
    .join(" ")
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*/g, ", ")
    .replace(/\s+([.?!…])/g, "$1")
    .trim();
  line = mergeArticles(line);

  // punteggiatura finale dall'ultimo token di punteggiatura
  const lastPunct = [...tokens].reverse().find((t) => t.isPunct && /^[.!?…]+$/.test(t.word));
  const punct = lastPunct ? lastPunct.word : ".";

  // copula a fine frase: «Roma in Italia è» → «Roma è in Italia»
  // (solo copula pura: «furono vinti» è già stato riordinato dal SOV)
  if (line && punct !== "?" && !line.includes("?")) {
    const lastP = parts[parts.length - 1];
    if (lastP && lastP.pos === "verbo" && PURE_COPULA.test(lastP.t)) {
      // se c'è un genitivo («Il migliore di tutti è») la copula resta alla fine
      if (!parts.slice(0, -1).some((p) => p.t.startsWith("di "))) {
        const cop = parts.pop()!;
        // inserisci dopo il soggetto (primo nominale al nominativo)
        let at = parts.findIndex((p) => (p.pos === "nome" || p.pos === "pronome") && p.case === "nominativo");
        if (at < 0) at = parts.findIndex((p) => p.pos === "aggettivo" && p.case === "nominativo");
        if (at < 0) at = 0;
        parts.splice(at + 1, 0, cop);
        line = parts
          .map((p) => p.t)
          .join(" ")
          .replace(/\s+/g, " ")
          .replace(/\s*,\s*/g, ", ")
          .replace(/\s+([.?!…])/g, "$1")
          .trim();
        line = mergeArticles(line);
      }
    }
  }

  if (!/[.!?…]$/.test(line)) line += punct;

  if (line) line = line.charAt(0).toUpperCase() + line.slice(1);
  return line;
}

/* ---------------------------------------------------------------------
   Riallineamento persona/numero/tempo per le traduzioni automatiche
   (MyMemory / DeepL). Le MT possono cambiare la persona («hai» invece di
   «voi»), il numero o il tempo del verbo principale: qui usiamo l'analisi
   grammaticale del latino per sostituire il verbo composto italiano
   (ausiliare + participio) con la forma corretta.
   --------------------------------------------------------------------- */

/** Ausiliari italiani dei tempi composti con persona/numero. */
const AUX_PN: Record<
  string,
  { person: 1 | 2 | 3; number: "singolare" | "plurale" }
> = {
  ho: { person: 1, number: "singolare" },
  hai: { person: 2, number: "singolare" },
  ha: { person: 3, number: "singolare" },
  abbiamo: { person: 1, number: "plurale" },
  avete: { person: 2, number: "plurale" },
  hanno: { person: 3, number: "plurale" },
  è: { person: 3, number: "singolare" },
  sei: { person: 2, number: "singolare" },
  siamo: { person: 1, number: "plurale" },
  siete: { person: 2, number: "plurale" },
  ero: { person: 1, number: "singolare" },
  eri: { person: 2, number: "singolare" },
  era: { person: 3, number: "singolare" },
  eravamo: { person: 1, number: "plurale" },
  eravate: { person: 2, number: "plurale" },
  erano: { person: 3, number: "plurale" },
  fui: { person: 1, number: "singolare" },
  fosti: { person: 2, number: "singolare" },
  fu: { person: 3, number: "singolare" },
  fummo: { person: 1, number: "plurale" },
  foste: { person: 2, number: "plurale" },
  furono: { person: 3, number: "plurale" },
};

/** Tutte le forme verbali italiane note (paradigmi irregolari + ausiliari).
    Usato dal motore di colorazione per riconoscere i verbi nella traduzione
    italiana anche quando l'euristica sulle desinenze non li individua
    («offre», «protegge», «custodiscono»). */
export function italianVerbForms(): Set<string> {
  const s = new Set<string>();
  for (const p of Object.values(IRREGULAR)) {
    for (const arr of [p.pres, p.impf, p.fut, p.cong ?? []]) {
      for (const f of arr) s.add(f);
    }
  }
  for (const k of Object.keys(AUX_PN)) s.add(k);
  return s;
}

/** «sono» è 1ª singolare (io sono arrivato) o 3ª plurale (loro sono arrivati):
    decide la desinenza del participio. */
function auxSonoPN(
  participle: string
): { person: 1 | 2 | 3; number: "singolare" | "plurale" } {
  return /(ato|uto|ito|sto|tto|rto|so|ta)$/i.test(participle)
    ? { person: 1, number: "singolare" }
    : { person: 3, number: "plurale" };
}

/** Pronomi soggetto espliciti per le persone 1ª e 2ª. */
const MT_PRONOUNS: Record<number, Record<string, string>> = {
  1: { singolare: "io", plurale: "noi" },
  2: { singolare: "tu", plurale: "voi" },
};

/** Tempi latini che in italiano si rendono legittimamente con un tempo composto. */
const MT_ALLOWED_COMPOUND = new Set([
  "perfetto",
  "piuccheperfetto",
  "futuro anteriore",
]);

const MT_AUX_RE =
  "(?:ho|hai|ha|abbiamo|avete|hanno|sono|sei|è|siamo|siete|ero|eri|era|eravamo|eravate|erano|fui|fosti|fu|fummo|foste|furono)";
const MT_PART_RE =
  "[a-zàèéìòù]+(?:ato|ata|ati|ate|uto|uta|uti|ute|ito|ita|iti|ite|sto|sta|sti|ste|tto|tta|tti|tte|rto|rta|rti|rte|sso|ssa|ssi|sse|so|sa|si|se)";
const MT_COMPOUND_RE = new RegExp(
  `\\b(io|tu|noi|voi|lui|lei|loro|egli|ella|essi|esse)?\\s*(${MT_AUX_RE})\\s+(?:(?:stato|stata|stati|state)\\s+)?(${MT_PART_RE})(?!\\w)`,
  "i"
);

/**
 * Corregge la persona/numero/tempo del verbo principale in una traduzione
 * automatica italiana, usando l'analisi grammaticale del latino.
 *
 * Interviene solo sui tempi composti (ausiliare + participio): se l'ausiliare
 * ha persona/numero diversi dal verbo latino, o se il tempo latino non ammette
 * il composto (presente, imperfetto, futuro), sostituisce l'intero verbo con
 * la forma coniugata corretta (es. «Hai elogiato» → «Voi lodavate»).
 * Copula (sum) e passivi veri sono lasciati intatti («è divisa», «erano detti»).
 */
export function fixMtVerb(line: string, group: SentenceGroup): string {
  // ultimo verbo finito con persona nota = verbo principale
  let main: AnalysisOption | null = null;
  for (const t of group.tokens) {
    if (t.isPunct || !t.analysis) continue;
    const o = t.analysis.options[t.analysis.selected];
    if (
      o.pos === "verbo" &&
      (o.mood === "indicativo" ||
        o.mood === "congiuntivo" ||
        o.mood === "imperativo") &&
      o.person != null &&
      o.number
    ) {
      main = o;
    }
  }
  if (!main) return line;

  // copula «sum/esse»: «è divisa», «è stato» sono corrette così
  const k = lemmaKey(main.lemma);
  if (k === "sum" || k === "esse" || k === "fui") return line;

  // passivo vero: l'italiano usa «essere + participio» per ogni tempo
  const deponent = (main.lemma ?? "").includes(" sum");
  if (main.voice === "passivo" && !deponent) return line;

  const form = conjugateVerb(verbInfinitive(main), main);
  if (!form) return line;

  const m = line.match(MT_COMPOUND_RE);
  if (!m) return line;

  // il match può iniziare con uno spazio («I soldati hanno…» → « hanno…»):
  // lo preserviamo nel rimpiazzo
  const lead = /^\s*/.exec(m[0])?.[0] ?? "";

  const auxWord = m[2].toLowerCase();
  const participle = m[3];
  const auxPN =
    auxWord === "sono" ? auxSonoPN(participle) : AUX_PN[auxWord];
  if (!auxPN) return line;

  const personOk =
    auxPN.person === main.person && auxPN.number === main.number;
  const tenseOk = MT_ALLOWED_COMPOUND.has(main.tense ?? "");
  if (personOk && tenseOk) return line;

  const wantPron = main.person === 1 || main.person === 2;
  let repl: string;
  if (wantPron) {
    repl = `${MT_PRONOUNS[main.person!][main.number!]} ${form}`;
  } else {
    // 3ª persona: conserva l'eventuale pronome soggetto già presente
    const keptPron = m[1] ? `${m[1]} ` : "";
    repl = keptPron + form;
  }

  const idx = m.index ?? 0;
  const atStart = idx === 0 || /[.!?]\s+$/.test(line.slice(0, idx));
  if (atStart && wantPron) repl = cap(repl);

  return line.slice(0, idx) + lead + repl + line.slice(idx + m[0].length);
}
