/**
 * External Data API helper
 *
 * NOTE: This module requires BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY
 * which are not available in the current environment.
 *
 * For AI-powered features, use the Easy-Peasy.AI API instead:
 * - Text generation: import { generateText } from "./_core/llm"
 * - Image generation: import { generateImage } from "./_core/imageGeneration"
 * - Transcription: import { createTranscription } from "./_core/voiceTranscription"
 *
 * For external data APIs, use fetch() directly with the relevant API's
 * authentication (store API keys in .env).
 */

export async function callDataApi(
  _apiId: string,
  _options: Record<string, unknown> = {}
): Promise<unknown> {
  throw new Error(
    "callDataApi is not available. Use the Easy-Peasy.AI API or direct fetch() calls instead. " +
    "See /home/user/.skills/easy-peasy-api.md for available AI endpoints."
  );
}
