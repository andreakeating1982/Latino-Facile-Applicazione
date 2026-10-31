/**
 * LLM helper using Easy-Peasy.AI API
 *
 * Uses the Easy-Peasy.AI text generation API with 50+ templates.
 * API key is available as EASY_PEASY_API_KEY in .env
 *
 * Example usage:
 *   const result = await generateText({
 *     preset: "custom-generator",
 *     keywords: "Write a product description for a smart watch",
 *     tone: "professional",
 *   });
 *   console.log(result[0].name); // Generated text
 */

const EASY_PEASY_API_URL = "https://easy-peasy.ai";

export type GenerateTextParams = {
  /** Template name (e.g., "custom-generator", "blog-post", "email-generation") */
  preset: string;
  /** Main input text or topic (max 5000 chars) */
  keywords: string;
  /** Desired tone (e.g., professional, friendly, funny) */
  tone?: string;
  /** Output length: "Short", "Medium", or "Long" */
  length?: "Short" | "Medium" | "Long";
  /** Number of outputs to generate (default: 1) */
  outputs?: number;
  /** Output language (default: English) */
  language?: string;
  /** Use advanced AI model (default: false) */
  shouldUseGPT4?: boolean;
  /** Additional context fields (vary by template) */
  extra1?: string;
  extra2?: string;
  extra3?: string;
};

export type GenerateTextResult = {
  id: number;
  name: string;
};

/**
 * Fallback: chat completions (Gemini) quando i template `/api/generate`
 * sono a quota («token limit») o non disponibili. Stessa chiave API.
 * Usato da traduzione e colorazione IA di Latino Facile.
 */
async function generateTextViaChat(
  params: GenerateTextParams
): Promise<GenerateTextResult[]> {
  const { chatCompletion } = await import("./chat");
  const content = await chatCompletion({
    messages: [
      {
        role: "system",
        content:
          params.language === "Italian"
            ? "Segui esattamente le istruzioni dell'utente. Se chiede JSON, rispondi SOLO con JSON valido, senza markdown."
            : "Follow the user's instructions exactly. If JSON is requested, reply with valid JSON only, no markdown.",
      },
      { role: "user", content: params.keywords },
    ],
    temperature: 0.2,
    /* 26/10w: CAUSA RADICE dei colori «REGOLE» su mobile (misurata): Gemini 3
    Flash spende ~800 token di RAGIONAMENTO che contano nel limite. Con
    1200/800 la risposta JSON (traduzioni + ruolo di ogni parola) veniva
    TRONCATA a metà → JSON illeggibile → verifyChunk null → colorazione
    per regole. Ora il limite lascia spazio a ragionamento + risposta. */
    max_tokens: params.length === "Long" ? 8000 : params.length === "Medium" ? 5000 : 2500,
  });
  const name = (content ?? "").trim();
  if (!name) throw new Error("Chat completion returned empty text");
  return [{ id: 0, name }];
}

/** Dopo il primo 401/quota non ritentiamo i template in questa sessione. */
let templatesAtQuota = false;

/**
 * Generate text content using Easy-Peasy.AI templates.
 * Se i template sono a quota (401 token limit) o falliscono, usa Gemini
 * via chat/completions — stessa chiave, stesso formato di ritorno.
 */
export async function generateText(
  params: GenerateTextParams
): Promise<GenerateTextResult[]> {
  const apiKey = process.env.EASY_PEASY_API_KEY;
  if (!apiKey) {
    throw new Error(
      "EASY_PEASY_API_KEY is not configured. Add it to your .env file."
    );
  }

  if (!templatesAtQuota) {
    try {
      const response = await fetch(`${EASY_PEASY_API_URL}/api/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify(params),
      });

      if (response.ok) {
        return (await response.json()) as GenerateTextResult[];
      }
      const errorText = await response.text().catch(() => "");
      const quota =
        response.status === 401 || /token limit|quota|insufficient/i.test(errorText);
      if (!quota) {
        throw new Error(
          `Text generation failed: ${response.status} ${response.statusText}${errorText ? ` – ${errorText}` : ""}`
        );
      }
      templatesAtQuota = true;
      console.warn(
        "[IA] template /api/generate a quota; uso chat Gemini (gemini-3-flash) da ora in poi."
      );
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("Text generation failed")) {
        throw err;
      }
      console.warn("[IA] template /api/generate non disponibile; uso chat Gemini.", err);
    }
  }

  return generateTextViaChat(params);
}

export type Preset = {
  slug: string;
  title: string;
  description: string;
  category: string;
  isFree: boolean;
};

/**
 * List available text generation templates (presets).
 *
 * Optional category filter: Social Media, Content, Business, HR, Marketing,
 * Resume, Education, Project Management, Tools, Other.
 */
export async function listPresets(
  category?: string
): Promise<{ presets: Preset[]; total: number; categories: string[] }> {
  const apiKey = process.env.EASY_PEASY_API_KEY;
  if (!apiKey) {
    throw new Error("EASY_PEASY_API_KEY is not configured.");
  }

  const url = new URL(`${EASY_PEASY_API_URL}/api/presets`);
  if (category) url.searchParams.set("category", category);

  const response = await fetch(url, {
    headers: { "x-api-key": apiKey },
  });

  if (!response.ok) {
    throw new Error(`Failed to list presets: ${response.status}`);
  }

  return response.json();
}
