/**
 * Audio transcription helper using Easy-Peasy.AI API
 *
 * Supports audio file transcription with speaker detection.
 * API key is available as EASY_PEASY_API_KEY in .env
 *
 * Example usage:
 *   const result = await createTranscription({
 *     audioUrl: "https://example.com/audio.mp3",
 *   });
 *   // Poll for result
 *   const transcription = await getTranscription(result.id);
 */

const EASY_PEASY_API_URL = "https://easy-peasy.ai";

export type CreateTranscriptionOptions = {
  /** URL to the audio file */
  audioUrl: string;
  /** Optional language hint */
  language?: string;
};

export type CreateTranscriptionResult = {
  id: number;
  status: string;
};

export type TranscriptionResult = {
  id: number;
  status: "processing" | "completed" | "failed";
  text?: string;
  language?: string;
};

/**
 * Start an audio transcription job.
 * This is async — use getTranscription() to poll for results.
 */
export async function createTranscription(
  options: CreateTranscriptionOptions
): Promise<CreateTranscriptionResult> {
  const apiKey = process.env.EASY_PEASY_API_KEY;
  if (!apiKey) {
    throw new Error(
      "EASY_PEASY_API_KEY is not configured. Add it to your .env file."
    );
  }

  const response = await fetch(
    `${EASY_PEASY_API_URL}/api/create-transcription`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        audioUrl: options.audioUrl,
        language: options.language,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Transcription failed: ${response.status} ${response.statusText}${errorText ? ` – ${errorText}` : ""}`
    );
  }

  return (await response.json()) as CreateTranscriptionResult;
}

/**
 * Poll for transcription result.
 * Call every 5-10 seconds until status is "completed".
 */
export async function getTranscription(
  transcriptionId: number
): Promise<TranscriptionResult> {
  const apiKey = process.env.EASY_PEASY_API_KEY;
  if (!apiKey) {
    throw new Error("EASY_PEASY_API_KEY is not configured.");
  }

  const response = await fetch(
    `${EASY_PEASY_API_URL}/api/get-transcription?id=${transcriptionId}`,
    {
      headers: { "x-api-key": apiKey },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get transcription: ${response.status}`);
  }

  return (await response.json()) as TranscriptionResult;
}
