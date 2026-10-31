/**
 * Normalizzazione del testo latino: legature (æ→ae, œ→oe), rimozione di
 * diacritici (macron, breve, dieresi, accenti) e di caratteri combinanti
 * Unicode (U+0300–U+036F).
 *
 * I dizionari (Whitaker, Collatinus) e la traduzione automatica lavorano su
 * testo ASCII, quindi la normalizzazione è necessaria per riconoscere:
 *   «Rōma» → «Roma»      (macron lungo, anche «fi\u0304lia» con carattere
 *                         combinante)
 *   «ămăt» → «amat»      (breve)
 *   «poëta» → «poeta»    (dieresi — senza normalizzazione la tokenizzazione
 *                         si rompeva su «ë»)
 *   «aëre» → «aere», «coëgit» → «coegit»
 *   «pœna» → «poena», «cælum» → «caelum»  (legature)
 *   «ā́» → «a»            (doppio diacritico: macron + accento)
 */

const COMBINING = /[\u0300-\u036f]/g;

/** Legature latine: la decomposizione NFD NON le separa, vanno mappate. */
const LIGATURES: Record<string, string> = {
  æ: "ae",
  ǽ: "ae", // æ con accento acuto
  ǣ: "ae", // æ con macron
  Æ: "AE",
  Ǽ: "AE",
  Ǣ: "AE",
  œ: "oe",
  Œ: "OE",
};
const LIGATURE_RE = /[æǽǣÆǼǢœŒ]/g;

/** Rimuove i diacritici da una stringa (preserva minuscole/maiuscole). */
export function stripDiacritics(s: string): string {
  return s
    .replace(LIGATURE_RE, (c) => LIGATURES[c])
    .normalize("NFD")
    .replace(COMBINING, "");
}

/** Normalizza una parola per la ricerca nel dizionario: minuscola, senza diacritici */
export function normalizeWord(s: string): string {
  return stripDiacritics(s).toLowerCase();
}

/** Normalizza un intero testo latino (per tokenizzazione, analisi, traduzione). */
export function normalizeLatinText(s: string): string {
  return stripDiacritics(s);
}
