/**
 * Trascrizione della FOTO con l'intelligenza artificiale (visione) —
 * ROUTE CONDIVISA `/api/ai/transcribe` (stesso contratto del Widget
 * metacognitivo per espressioni: trapianto 26/10).
 *
 * La foto ritagliata dallo studente viene letta da Gemini (stessa chiave
 * EASY_PEASY_API_KEY della traduzione/colorazione, via endpoint
 * OpenAI-compatibile) e il testo latino finisce nel campo di input.
 * Se l'IA non risponde o non vede testo, il client usa automaticamente
 * l'OCR classico (Tesseract) sulla stessa foto — qui si lancia errore.
 *
 * L'IA TRASCRIVE SOLO: mai risolvere né colorare in questa route.
 */
import OpenAI from "openai";
import type { ChatCompletionContentPart } from "openai/resources";
import type { Express } from "express";

/** Lunghezza massima del base64 accettato (~7,5 MB di immagine). */
const MAX_B64_LEN = 10_000_000;
/** Lunghezza massima del testo trascritto (il client tronca a 400). */
const MAX_TEXT_LEN = 2000;

/** Controlla il data URL dell'immagine (solo foto JPEG/PNG/WEBP). */
export function validateImageInput(immagine: string): string {
  const clean = (immagine ?? "").trim();
  const m = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=\s]+)$/i.exec(clean);
  if (!m) throw new Error("formato immagine non valido");
  if (m[2].replace(/\s/g, "").length > MAX_B64_LEN) {
    throw new Error("immagine troppo grande");
  }
  return clean;
}

/** Pulisce la risposta dell'IA: niente fence/virgolette esterne, spazi unici. */
export function normalizeTranscription(raw: string): string {
  const t = (raw ?? "")
    .trim()
    .replace(/^```[a-z]*\s*/i, "")
    .replace(/```\s*$/, "")
    .replace(/^["'“”«»\s]+|["'“”«»\s]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (/^nessun testo/i.test(t)) return "";
  return t.slice(0, MAX_TEXT_LEN);
}

/** Contratto IA (stesse REGOLE ASSOLUTE del Widget metacognitivo,
 *  adattate al dominio latino): l'IA trascrive soltanto. */
const PROMPT =
  "Questa foto contiene un testo in LATINO (frasi stampate o scritte a mano " +
  "su libro, quaderno o foglio: spesso un esercizio con frasi NUMERATE). " +
  "Trascrivi TUTTO il testo latino visibile, dall'inizio FINO ALL'ULTIMA " +
  "riga: non fermarti mai alle prime frasi, leggi anche le ultime. " +
  "REGOLE ASSOLUTE: " +
  "1. TRASCRIVI soltanto ciò che è scritto: NON tradurre, NON colorare, " +
  "NON correggere la grammatica, NON aggiungere né togliere parole. " +
  "2. Rispondi SOLO con il testo trascritto, senza virgolette, senza " +
  "spiegazioni, senza «Ecco la trascrizione», senza markdown. " +
  "3. Se le frasi sono numerate (1. 2. 3. …), MANTIENI i numeri e separa " +
  "ogni voce con una riga vuota. " +
  "4. Il latino non ha accenti: non aggiungerne mai (scrivi «e», non «è»). " +
  "5. NON interrompere MAI la trascrizione a metà: leggi fino all'ultima riga. " +
  "6. Ignora testi estranei (intestazioni, note): trascrivi SOLO le frasi latine. " +
  "Se nella foto non vedi alcun testo latino, rispondi esattamente con: " +
  "NESSUN TESTO";

export interface FotoTranscribeResult {
  text: string;
  source: "ai";
}

/** Legge la foto con l'IA e restituisce il testo latino trascritto. */
export async function transcribePhoto(immagine: string): Promise<FotoTranscribeResult>;
/** Variante con kind del Widget ("photo" dal flusso foto, "ink" inutilizzato). */
export async function transcribePhoto(immagine: string, _kind?: "photo" | "ink"): Promise<FotoTranscribeResult>;
export async function transcribePhoto(immagine: string, _kind?: "photo" | "ink"): Promise<FotoTranscribeResult> {
  void _kind;
  const apiKey = process.env.EASY_PEASY_API_KEY;
  if (!apiKey) throw new Error("trascrizione IA non configurata");
  const dataUrl = validateImageInput(immagine);
  const client = new OpenAI({ apiKey, baseURL: "https://easy-peasy.ai/api" });
  const parts: ChatCompletionContentPart[] = [
    { type: "text", text: PROMPT },
    { type: "image_url", image_url: { url: dataUrl } },
  ];
  const res = await client.chat.completions.create({
    model: "gemini-3-flash",
    messages: [{ role: "user", content: parts }],
    temperature: 0,
    /* 4000 come nel Widget: con testi lunghi un limite basso TRONCA la
       trascrizione a metà (stessa lezione del trapianto). */
    max_tokens: 4000,
  });
  const raw = res.choices[0]?.message?.content;
  const text = normalizeTranscription(typeof raw === "string" ? raw : "");
  if (!text) throw new Error("nessun testo riconosciuto nella foto");
  return { text, source: "ai" };
}

/** Registra la route CONDIVISA `POST /api/ai/transcribe` (stesso contratto
 *  del Widget metacognitivo per espressioni).
 *  Body: { image: dataURL, kind: "photo" } → { text }.
 *  Senza EASY_PEASY_API_KEY risponde 503 e il client ripiega sul
 *  riconoscimento locale (Tesseract). Timeout 90 s. */
export function registerAiTranscribeRoute(app: Express) {
  app.post("/api/ai/transcribe", async (req, res) => {
    const apiKey = process.env.EASY_PEASY_API_KEY;
    if (!apiKey) {
      res.status(503).json({ error: "IA non configurata: manca EASY_PEASY_API_KEY sul server." });
      return;
    }
    const image = typeof req.body?.image === "string" ? req.body.image : "";
    try {
      const out = await transcribePhoto(image);
      res.json({ text: out.text });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("AI transcribe error:", msg.slice(0, 200));
      res.status(502).json({ error: "La trascrizione IA non è andata a buon fine." });
    }
  });
}
