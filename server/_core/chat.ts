/**
 * Chat completions helper using Easy-Peasy.AI's OpenAI-compatible API
 *
 * This uses the OpenAI SDK pointed at Easy-Peasy.AI's chat/completions endpoint,
 * powered by Gemini 3 Flash.
 *
 * Example usage:
 *   const response = await chatCompletion({
 *     messages: [
 *       { role: "system", content: "You are a helpful assistant." },
 *       { role: "user", content: "Hello!" },
 *     ],
 *   });
 *   console.log(response); // "Hi! How can I help?"
 *
 *   // Streaming:
 *   for await (const chunk of chatCompletionStream({ messages })) {
 *     process.stdout.write(chunk);
 *   }
 */

import OpenAI from "openai";

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (_client) return _client;

  const apiKey = process.env.EASY_PEASY_API_KEY;
  if (!apiKey) {
    throw new Error(
      "EASY_PEASY_API_KEY is not configured. Add it to your .env file."
    );
  }

  _client = new OpenAI({
    apiKey,
    baseURL: "https://easy-peasy.ai/api",
  });

  return _client;
}

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ChatOptions = {
  /** Chat messages */
  messages: ChatMessage[];
  /** Model name (default: "gemini-3-flash") */
  model?: string;
  /** Sampling temperature 0-2 (default: 0.7) */
  temperature?: number;
  /** Max tokens to generate */
  max_tokens?: number;
};

/**
 * Send a chat completion request and return the assistant's response text.
 */
export async function chatCompletion(options: ChatOptions): Promise<string> {
  const client = getClient();

  const response = await client.chat.completions.create({
    model: options.model || "gemini-3-flash",
    messages: options.messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.max_tokens,
  });

  return response.choices[0]?.message?.content || "";
}

/**
 * Send a streaming chat completion request.
 * Yields text chunks as they arrive.
 */
export async function* chatCompletionStream(
  options: ChatOptions
): AsyncGenerator<string> {
  const client = getClient();

  const stream = await client.chat.completions.create({
    model: options.model || "gemini-3-flash",
    messages: options.messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.max_tokens,
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      yield content;
    }
  }
}
