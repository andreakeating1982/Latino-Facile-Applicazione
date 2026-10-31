/**
 * Traduzione latino → italiano tramite l'API UFFICIALE DeepL.
 *
 * DeepL supporta ufficialmente il latino (codice LA) e lo traduce con una
 * qualità molto superiore a MyMemory: è il motore di traduzione principale
 * dell'app quando una chiave è configurata.
 *
 * Come ottenere una chiave gratuita (piano "API Developer": 1 milione di
 * caratteri in credito una tantum, nessuna carta di credito richiesta):
 *   1. https://www.deepl.com/pro-api  → piano Developer → "Iscriviti gratis"
 *      (se si è già loggati con l'account del traduttore, uscire prima:
 *      l'account API è separato da quello del traduttore gratuito)
 *   2. Dopo la registrazione andare su https://app.deepl.com/your-account/keys
 *      → scheda "Chiavi API e limiti" → "Crea chiave"
 *   3. Copiare la chiave (formato «xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx:fx»)
 *      e incollarla nel file `.env` del progetto come:
 *        DEEPL_API_KEY=la-tua-chiave
 *
 * Senza chiave configurata il modulo non fa nulla: la traduzione ripiega
 * automaticamente su MyMemory e sul glossario offline.
 */

const DEEPL_FREE_URL = "https://api-free.deepl.com/v2/translate";
const DEEPL_PRO_URL = "https://api.deepl.com/v2/translate";

/** Cache in memoria delle traduzioni già ottenute (frase → traduzione). */
const cache = new Map<string, string>();

/** True se una chiave DeepL è configurata nell'ambiente. */
export function deeplConfigured(): boolean {
  return Boolean(process.env.DEEPL_API_KEY);
}

/** Traduce una frase latina in italiano. null se non disponibile. */
export async function deeplTranslate(sentence: string): Promise<string | null> {
  const key = sentence.replace(/\s+/g, " ").trim();
  const apiKey = process.env.DEEPL_API_KEY?.trim();
  if (!key || !apiKey) return null;

  const hit = cache.get(key);
  if (hit) return hit;

  const body = new URLSearchParams({
    text: key,
    source_lang: "LA",
    target_lang: "IT",
  });
  // le chiavi «:fx» appartengono al piano gratuito (Developer), le altre al piano Pro
  const urls = apiKey.endsWith(":fx")
    ? [DEEPL_FREE_URL]
    : [DEEPL_PRO_URL, DEEPL_FREE_URL];
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `DeepL-Auth-Key ${apiKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) continue; // 401/403/429: prova l'altro endpoint

      const data = (await res.json()) as {
        translations?: { text?: string }[];
      };
      const text = data.translations?.[0]?.text?.trim();
      if (!text) return null;
      // risposta identica all'input = DeepL non ha tradotto
      if (text.toLowerCase() === key.toLowerCase()) return null;

      if (cache.size > 4000) cache.clear();
      cache.set(key, text);
      return text;
    } catch {
      continue;
    }
  }
  return null;
}
