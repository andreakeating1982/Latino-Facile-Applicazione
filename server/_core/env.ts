/**
 * Environment configuration
 * Better Auth uses environment variables directly for OAuth providers
 */
export const ENV = {
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",
  // Better Auth will read these directly:
  // - GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
  // - GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET
  // - BETTER_AUTH_SECRET (for session signing)
  // Easy-Peasy.AI API for text generation, image generation, TTS, etc.
  easyPeasyApiKey: process.env.EASY_PEASY_API_KEY ?? "",
};
