/**
 * Client per l'API di Collatinus-web (Biblissima) e parser dell'HTML restituito.
 * Endpoint: POST https://outils.biblissima.fr/collatinus-web/collatinus-web.php
 * Parametri: texte, langue, opera=traite_txt, action=Analyser, token, medieval
 */

import { stripDiacritics } from "./normalize";

const BASE_PAGE = "https://outils.biblissima.fr/fr/collatinus-web/";
const API_URL = "https://outils.biblissima.fr/collatinus-web/collatinus-web.php";
const UA = "Mozilla/5.0 (X11; Linux x86_64) LatinoFacileApp/1.0";

export interface RawAnalysisLine {
  form: string; // forma flessa senza diacritici
  desc: string; // descrizione morfologica (francese), es. "accusatif singulier"
}

export interface RawLemma {
  lemma: string; // lemma senza diacritici
  summary: string; // riassunto morfologico (es. "i, m.")
  freq: number; // frequenza LASLA
  translation: string; // traduzione (italiana)
  lines: RawAnalysisLine[]; // righe di analisi annidate (vuote per le parole-funzione)
}

export interface RawWordResult {
  word: string; // parola richiesta
  lemmas: RawLemma[];
}

let session: { token: string; cookie: string } | null = null;
let sessionAt = 0;
const SESSION_TTL = 10 * 60 * 1000;

async function getSession() {
  if (session && Date.now() - sessionAt < SESSION_TTL) return session;
  const res = await fetch(BASE_PAGE, { headers: { "User-Agent": UA } });
  const html = await res.text();
  const token = html.match(/name="token" value="([^"]+)"/)?.[1] ?? "";
  const cookies: string[] = [];
  if (typeof res.headers.getSetCookie === "function") {
    for (const c of res.headers.getSetCookie()) cookies.push(c.split(";")[0]);
  } else {
    const sc = res.headers.get("set-cookie");
    if (sc) for (const c of sc.split(",")) cookies.push(c.split(";")[0].trim());
  }
  session = { token, cookie: cookies.join("; ") };
  sessionAt = Date.now();
  return session;
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, "");
}

/**
 * Estrae i <li> di primo livello da un frammento HTML, gestendo i <li>
 * annidati (le righe di analisi dentro i lemmi).
 */
function extractTopLis(html: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let start = -1;
  const re = /<li\b[^>]*>|<\/li>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    if (m[0].startsWith("</li>")) {
      depth--;
      if (depth === 0) {
        out.push(html.slice(start, m.index + 5));
        start = -1;
      }
    } else {
      if (depth === 0) start = m.index;
      depth++;
    }
  }
  return out;
}

/**
 * Estrae il contenuto dell'<ul> che si apre a partire da `from`, bilanciando
 * gli <ul> annidati (torna null se non trova l'apertura o la chiusura).
 */
function extractBalancedUl(html: string, from: number): string | null {
  const start = html.indexOf("<ul", from);
  if (start < 0) return null;
  let depth = 0;
  const re = /<\/?ul[^>]*>/g;
  re.lastIndex = start;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    if (m[0].startsWith("</ul")) {
      depth--;
      if (depth === 0) {
        const openEnd = html.indexOf(">", start) + 1;
        return html.slice(openEnd, m.index);
      }
    } else {
      depth++;
    }
  }
  return null;
}

/**
 * Estrae i blocchi delle parole dal risultato HTML di Collatinus.
 * Struttura: <ul><li><strong><big>parola</big></strong><ul>…lemmi…</ul></li>…</ul>
 */
export function parseCollatinusHtml(html: string): RawWordResult[] {
  const results: RawWordResult[] = [];
  for (const block of extractTopLis(html)) {
    const big = block.match(/<big>([\s\S]*?)<\/big>/)?.[1] ?? "";
    const word = stripDiacritics(stripTags(big)).trim();
    if (!word) continue;
    const lemmasContent = extractBalancedUl(block, 0);
    const lemmas: RawLemma[] = [];
    if (lemmasContent !== null) {
    for (const li of extractTopLis(lemmasContent)) {
      const strong = li.match(/<strong>([\s\S]*?)<\/strong>/)?.[1] ?? "";
      const lemma = stripDiacritics(stripTags(strong)).trim();
      if (!lemma) continue;
      const lines: RawAnalysisLine[] = [];
      const innerUl = extractBalancedUl(li, 0);
      if (innerUl !== null) {
        for (const line of extractTopLis(innerUl)) {
          const txt = stripDiacritics(stripTags(line)).replace(/\s+/g, " ").trim();
          if (!txt) continue;
          const m = txt.match(/^(.+?)\s+([^\s].*)$/);
          if (m) lines.push({ form: m[1].trim(), desc: m[2].trim() });
          else lines.push({ form: txt, desc: "" });
        }
      }
      // riassunto morfologico: <em>…</em>
      const em = li.match(/<em>([\s\S]*?)<\/em>/)?.[1] ?? "";
      const summary = stripDiacritics(stripTags(em)).replace(/\s+/g, " ").trim();
      // frequenza: <small>(N)</small>
      const freqM = li.match(/<small>\((\d+)\)<\/small>/);
      const freq = freqM ? parseInt(freqM[1], 10) : 0;
      // traduzione: dopo " : " (togliendo le righe annidate)
      const body = stripTags(li.replace(/<ul[^>]*>[\s\S]*<\/ul>/, "")).replace(/\s+/g, " ").trim();
      const colon = body.indexOf(":");
      const translation = colon >= 0 ? body.slice(colon + 1).trim() : "";
      lemmas.push({ lemma, summary, freq, translation, lines });
    }
    }
    if (lemmas.length > 0) results.push({ word, lemmas });
  }
  return results;
}

/** Chiama l'API Collatinus per una singola parola e restituisce l'analisi grezza. */
export async function fetchCollatinus(word: string): Promise<RawWordResult | null> {
  const { token, cookie } = await getSession();
  const body = new URLSearchParams({
    texte: word,
    langue: "it ",
    opera: "traite_txt",
    action: "Analyser",
    token,
    medieval: "false",
  });
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "User-Agent": UA,
      "Content-Type": "application/x-www-form-urlencoded",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body.toString(),
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) return null;
  const html = await res.text();
  const parsed = parseCollatinusHtml(html);
  return parsed.find((r) => r.word === stripDiacritics(word).toLowerCase()) ?? parsed[0] ?? null;
}
