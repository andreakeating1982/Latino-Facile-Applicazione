/**
 * Traduzione automatica latino → italiano tramite l'API pubblica MyMemory.
 *
 * È il motore di mezzo del flusso di traduzione:
 *   1. IA Easy-Peasy (quando la quota del piano è disponibile)
 *   2. MyMemory  ← questo modulo (vera traduzione automatica, gratuita)
 *   3. glossario offline parola-per-parola (ultima risorsa)
 *
 * MyMemory supporta il latino ed è gratuita: senza chiave ~5 000 caratteri al
 * giorno per IP; indicando un'email di riferimento (parametro `de`) il limite
 * sale a ~50 000 caratteri al giorno. Una cache in memoria evita di richiedere
 * più volte la stessa frase (tipico in classe, quando tutti analizzano lo
 * stesso brano).
 */

const MYMEMORY_URL = "https://api.mymemory.translated.net/get";
const REQUESTER_EMAIL = "latino-facile@easy-peasy.ai";

/** Cache in memoria delle traduzioni già ottenute (frase → traduzione). */
const cache = new Map<string, string>();

/** Istante in cui MyMemory ha segnalato la quota esaurita (0 = mai). */
let quotaBlockedAt = 0;

/** Riprova MyMemory dopo 6 ore se la quota giornaliera è esaurita. */
const QUOTA_RETRY_MS = 6 * 60 * 60 * 1000;

/** Pulisce il testo restituito da MyMemory (virgole finali, spazi, nomi). */
function cleanMt(text: string, original: string): string {
  let t = text.trim();
  // MyMemory aggiunge spesso una virgola finale: la togliamo
  t = t.replace(/,$/, "");
  // spazi doppi ed eventuali spazi prima della punteggiatura
  t = t.replace(/\s{2,}/g, " ").replace(/\s+([.,;:!?])/g, "$1");
  // prima lettera maiuscola
  t = t.charAt(0).toUpperCase() + t.slice(1);
  // nomi propri sistemati
  t = t.replace(/\bCesar\b/g, "Cesare").replace(/\bVesontius\b/g, "Vesontio");
  // se la frase originale termina con un segno forte, assicuriamocelo
  const last = original.trim().slice(-1);
  if (/[.!?]/.test(last) && !/[.!?]$/.test(t)) t += last;
  return t;
}

/** Un singolo tentativo di chiamata a MyMemory (null se non riuscito). */
async function tryFetch(key: string): Promise<string | null> {
  try {
    const url =
      `${MYMEMORY_URL}?q=${encodeURIComponent(key)}` +
      `&langpair=la|it&de=${encodeURIComponent(REQUESTER_EMAIL)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(7000) });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      responseStatus?: number;
      responseData?: { translatedText?: string };
      quotaFinished?: boolean;
    };

    if (data.quotaFinished) {
      quotaBlockedAt = Date.now();
      return null;
    }
    if (data.responseStatus !== 200) return null;

    const raw = data.responseData?.translatedText?.trim();
    if (!raw) return null;
    // risposta identica all'input = fallimento silenzioso
    if (raw.toLowerCase() === key.toLowerCase()) return null;

    return cleanMt(raw, key);
  } catch {
    return null;
  }
}

/**
 * Traduce una singola frase latina in italiano.
 * Restituisce null se la traduzione non è disponibile (rete, quota, errore).
 */
export async function myMemoryTranslate(sentence: string): Promise<string | null> {
  const key = sentence.replace(/\s+/g, " ").trim();
  if (!key) return null;

  // quota esaurita di recente? aspetta prima di riprovare
  if (quotaBlockedAt && Date.now() - quotaBlockedAt < QUOTA_RETRY_MS) return null;

  const hit = cache.get(key);
  if (hit) return hit;

  // fino a due tentativi: MyMemory a volte risponde vuoto per un rate limit
  // momentaneo (tipico quando una classe traduce lo stesso brano insieme)
  for (let attempt = 0; attempt < 2; attempt++) {
    const out = await tryFetch(key);
    if (out) {
      if (cache.size > 4000) cache.clear();
      cache.set(key, out);
      return out;
    }
    if (quotaBlockedAt) return null;
    if (attempt === 0) await new Promise((r) => setTimeout(r, 350));
  }
  return null;
}
