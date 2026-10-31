/**
 * Limite di input in PAROLE (non caratteri): più equo per il latino,
 * dove le parole sono lunghe. Usato dal campo di testo, da COLORA FRASE
 * e dall'inserimento del testo riconosciuto da foto/PDF.
 */

/** Conta le parole (sequenze separate da spazi bianchi). */
export function contaParole(testo: string): number {
  const t = (testo ?? "").trim();
  return t ? t.split(/\s+/).length : 0;
}

/** Tronca alle prime N parole, sul confine di parola. */
export function troncaParole(testo: string, max: number): string {
  const parole = (testo ?? "").trim().split(/\s+/).filter(Boolean);
  return parole.slice(0, max).join(" ");
}
