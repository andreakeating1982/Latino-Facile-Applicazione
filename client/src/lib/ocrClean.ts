/** Normalizza il testo riconosciuto: spazi unici, nessuna riga spezzata. */
export function cleanOcrText(raw: string): string {
  return raw
    .replace(/[|]/g, "l")
    .replace(/[“”«»]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}
