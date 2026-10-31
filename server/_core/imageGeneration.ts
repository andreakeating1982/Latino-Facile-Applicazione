/**
 * Image generation helper using Easy-Peasy.AI API
 *
 * Supports 40+ models including Z-Image Turbo, Nano Banana Pro, Midjourney, FLUX.2, Nano Banana 2, Imagen 4.
 * API key is available as EASY_PEASY_API_KEY in .env
 *
 * Example usage:
 *   const images = await generateImage({
 *     prompt: "A futuristic city at sunset",
 *     model: "Z-Image Turbo",
 *     waitForResult: true,
 *   });
 *   console.log(images[0].image_url); // Generated image URL
 */

const EASY_PEASY_API_URL = "https://easy-peasy.ai";

export type GenerateImageOptions = {
  /** Text description of the image to generate */
  prompt: string;
  /** AI model to use (e.g., "Nano Banana 2", "Midjourney V7", "FLUX.2", "Stable Diffusion 3.5") */
  model?: string;
  /** Image dimensions/aspect ratio (e.g., "1:1", "16:9") — varies by model */
  dimensions?: string;
  /** Number of images to generate (default: 1) */
  outputs?: number;
  /** Enable HD quality (select models only) */
  useHD?: boolean;
  /** Source image URL for image-to-image transformations */
  image?: string;
  /** Quality level ("1K" or "2K") for FLUX.2 and select models */
  resolution?: string;
  /** Wait for result before returning (default: false) */
  waitForResult?: boolean;
};

export type GenerateImageResult = {
  id: number;
  image_url: string;
  model: string;
  used_credits: number;
  prompt: string;
};

/**
 * Generate images using Easy-Peasy.AI.
 * Returns an array of generated image results with public URLs.
 */
export async function generateImage(
  options: GenerateImageOptions
): Promise<GenerateImageResult[]> {
  const apiKey = process.env.EASY_PEASY_API_KEY;
  if (!apiKey) {
    throw new Error(
      "EASY_PEASY_API_KEY is not configured. Add it to your .env file."
    );
  }

  const response = await fetch(`${EASY_PEASY_API_URL}/api/generate-image`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      prompt: options.prompt,
      model: options.model || "DALL-E 3",
      dimensions: options.dimensions,
      outputs: options.outputs || 1,
      useHD: options.useHD,
      image: options.image,
      resolution: options.resolution,
      waitForResult: options.waitForResult ?? true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Image generation failed: ${response.status} ${response.statusText}${errorText ? ` – ${errorText}` : ""}`
    );
  }

  return (await response.json()) as GenerateImageResult[];
}
