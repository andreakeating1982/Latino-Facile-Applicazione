/** Trascrizione IA (visione) delle foto — lato BROWSER.
 *
 *  La foto ritagliata viene inviata al server (POST /api/ai/transcribe,
 *  kind "photo") che la fa leggere a Gemini e restituisce il testo latino.
 *  L'IA TRASCRIVE SOLO: il testo finisce nel campo di input, dove lo
 *  studente lo controlla prima di premere il pulsante di colorazione
 *  (mai analisi automatica).
 *
 *  Se l'IA non risponde (503, timeout, foto illeggibile) il chiamante
 *  ripiega sull'OCR locale (Tesseract) sulla stessa foto: il flusso non si
 *  interrompe mai.
 */

export type AiKind = "photo";

export class AiUnavailableError extends Error {}

/** Pulisce la trascrizione IA: niente fence di codice, spazi unici. */
function cleanAiLatin(raw: string): string {
  return (raw ?? "")
    .trim()
    .replace(/^```[a-z]*\s*/i, "")
    .replace(/```\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** La trascrizione è utilizzabile se contiene almeno una parola latina
 *  (finché non è il segnale NESSUN TESTO). */
function aiLatinPlausible(t: string): boolean {
  if (!t) return false;
  if (/^nessun testo/i.test(t)) return false;
  return /[a-zà-ü]{2,}/i.test(t);
}

/** Invia un'immagine (dataURL) all'IA e ritorna il testo latino PULITO.
 *  Lancia AiUnavailableError se il server non ha l'IA configurata. */
export async function aiTranscribeImage(dataUrl: string, kind: AiKind): Promise<string> {
  void kind;
  let res: Response;
  try {
    res = await fetch("/api/ai/transcribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: dataUrl, kind: "photo" }),
    });
  } catch {
    throw new AiUnavailableError("Rete non disponibile");
  }
  if (!res.ok) {
    let msg = `IA non disponibile (${res.status})`;
    try {
      const j = (await res.json()) as { error?: string };
      if (j?.error) msg = j.error;
    } catch {
      /* corpo non JSON */
    }
    throw new AiUnavailableError(msg);
  }
  const j = (await res.json()) as { text?: string };
  const raw = typeof j.text === "string" ? j.text : "";
  const text = cleanAiLatin(raw);
  if (!aiLatinPlausible(text)) {
    throw new Error("La trascrizione IA non contiene un testo utilizzabile.");
  }
  return text;
}

/** Converte un File immagine in un dataURL JPEG ridotto (lato lungo max
 *  `maxSide`): sufficiente all'IA e leggero da trasmettere. L'immagine
 *  ORIGINALE resta disponibile per il riconoscimento locale di riserva
 *  (che vuole più risoluzione). */
export async function fileToScaledDataUrl(file: File, maxSide = 1800): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas non disponibile");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  return canvas.toDataURL("image/jpeg", 0.92);
}
