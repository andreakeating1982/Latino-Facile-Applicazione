/**
 * Better Auth configuration for Neon PostgreSQL
 */
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db";

// Only create auth if database and secret are available
function createAuth() {
  if (!db) {
    console.warn("[Auth] Database not available - auth will not work");
    return null;
  }

  // BETTER_AUTH_SECRET is required for session encryption
  // It's auto-generated during project initialization
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    console.warn("[Auth] BETTER_AUTH_SECRET not set - auth will not work");
    return null;
  }

  try {
    return betterAuth({
      database: drizzleAdapter(db, {
        provider: "pg",
      }),
      secret, // Required for session/cookie encryption
      emailAndPassword: {
        enabled: true,
        autoSignIn: true,
      },
      user: {
        additionalFields: {
          role: {
            type: "string",
            defaultValue: "user",
            input: false,
          },
        },
      },
      socialProviders: {
        ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
          ? {
              google: {
                clientId: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
              },
            }
          : {}),
        ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
          ? {
              github: {
                clientId: process.env.GITHUB_CLIENT_ID,
                clientSecret: process.env.GITHUB_CLIENT_SECRET,
              },
            }
          : {}),
      },
      session: {
        expiresIn: 60 * 60 * 24 * 30,
        updateAge: 60 * 60 * 24,
      },
      trustedOrigins: process.env.TRUSTED_ORIGINS?.split(",") || [],
    });
  } catch (error) {
    console.error("[Auth] Failed to initialize Better Auth:", error);
    return null;
  }
}

export const auth = createAuth();

// Export types for use across the app
export type User = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  role?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type Session = {
  user: User;
  session: {
    id: string;
    expiresAt: Date;
    token: string;
    userId: string;
  };
};
