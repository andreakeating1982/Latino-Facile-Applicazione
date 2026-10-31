/**
 * Google OAuth Proxy Callback Handler
 *
 * This endpoint receives a signed JWT from the centralized OAuth proxy
 * at auth.easy-peasy.site, verifies it, and creates a Better Auth session.
 *
 * Flow:
 * 1. auth.easy-peasy.site handles Google OAuth and creates a signed JWT
 * 2. Redirects here with ?token=<jwt>
 * 3. We verify the JWT, find-or-create the user, create a session
 * 4. Set session cookie and redirect to /
 */
import type { Express, Request, Response } from "express";
import crypto from "crypto";
import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { user, account, session } from "../../drizzle/schema";
import { auth } from "./auth";

interface GoogleProfile {
  email: string;
  name: string;
  picture: string | null;
  googleId: string;
}

interface ProfileTokenPayload {
  profile: GoogleProfile;
  aud: string;
  iat: number;
  exp: number;
}

function base64urlDecode(str: string): string {
  return Buffer.from(str, "base64url").toString("utf8");
}

function verifyProfileToken(token: string): ProfileTokenPayload {
  const secret = process.env.OAUTH_PROXY_SECRET;
  if (!secret) throw new Error("OAUTH_PROXY_SECRET is not set");

  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid token format");

  const [header, payload, signature] = parts;

  // Verify HMAC-SHA256 signature
  const expectedSig = crypto
    .createHmac("sha256", secret)
    .update(`${header}.${payload}`)
    .digest("base64url");

  if (
    !crypto.timingSafeEqual(
      Buffer.from(signature, "base64url"),
      Buffer.from(expectedSig, "base64url")
    )
  ) {
    throw new Error("Invalid token signature");
  }

  const decoded = JSON.parse(base64urlDecode(payload)) as ProfileTokenPayload;

  // Check expiry
  if (Math.floor(Date.now() / 1000) > decoded.exp) {
    throw new Error("Token expired");
  }

  return decoded;
}

function generateId(): string {
  return crypto.randomBytes(16).toString("hex");
}

export function registerGoogleProxyCallback(app: Express) {
  app.get("/api/auth/google-proxy-callback", async (req: Request, res: Response) => {
    const token = req.query.token as string | undefined;

    if (!token) {
      return res.status(400).json({ error: "Missing token parameter" });
    }

    if (!db) {
      return res.status(503).json({ error: "Database not available" });
    }

    try {
      // 1. Verify the signed JWT
      const { profile, aud } = verifyProfileToken(token);

      // 2. Validate audience matches this app's origin
      const host = req.headers["x-forwarded-host"] || req.headers.host;
      // Always use https — the app runs behind a TLS-terminating proxy
      const appOrigin = `https://${host}`;

      if (aud !== appOrigin) {
        console.error(
          `[Google Proxy] Audience mismatch: expected ${appOrigin}, got ${aud}`
        );
        return res.status(403).json({ error: "Token audience mismatch" });
      }

      // 3. Find or create user via Better Auth tables
      const now = new Date();

      // Look for existing Google account
      const existingAccounts = await db
        .select()
        .from(account)
        .where(
          and(
            eq(account.providerId, "google"),
            eq(account.accountId, profile.googleId)
          )
        )
        .limit(1);

      let userId: string;

      if (existingAccounts.length > 0) {
        // User exists with this Google account
        userId = existingAccounts[0].userId;

        // Update user info (name, picture may have changed)
        await db
          .update(user)
          .set({
            name: profile.name,
            image: profile.picture,
            updatedAt: now,
          })
          .where(eq(user.id, userId));
      } else {
        // Check if user exists with same email
        const existingUsers = await db
          .select()
          .from(user)
          .where(eq(user.email, profile.email))
          .limit(1);

        if (existingUsers.length > 0) {
          // Link Google account to existing user
          userId = existingUsers[0].id;
        } else {
          // Create new user
          userId = generateId();
          await db.insert(user).values({
            id: userId,
            name: profile.name,
            email: profile.email,
            emailVerified: true,
            image: profile.picture,
            createdAt: now,
            updatedAt: now,
          });
        }

        // Create account link
        await db.insert(account).values({
          id: generateId(),
          accountId: profile.googleId,
          providerId: "google",
          userId,
          createdAt: now,
          updatedAt: now,
        });
      }

      // 4. Create session
      const sessionToken = generateId() + generateId();
      const sessionId = generateId();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      await db.insert(session).values({
        id: sessionId,
        token: sessionToken,
        userId,
        expiresAt,
        createdAt: now,
        updatedAt: now,
        ipAddress: req.ip || null,
        userAgent: req.headers["user-agent"] || null,
      });

      // 5. Set Better Auth session cookie
      // Better Auth uses "better-auth.session_token" as the cookie name
      res.cookie("better-auth.session_token", sessionToken, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        expires: expiresAt,
      });

      // 6. Redirect to home page
      return res.redirect("/");
    } catch (err) {
      console.error("[Google Proxy Callback] Error:", err);
      const message =
        err instanceof Error ? err.message : "Authentication failed";
      return res.redirect(`/login?error=${encodeURIComponent(message)}`);
    }
  });
}
