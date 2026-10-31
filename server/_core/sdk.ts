/**
 * SDK for session management with Better Auth
 */
import { ForbiddenError } from "@shared/_core/errors";
import type { Request } from "express";
import { auth, type User } from "./auth";

export type SessionPayload = {
  userId: string;
  email?: string;
  name?: string;
};

class SDKServer {
  /**
   * Authenticate request using Better Auth session
   * Returns the Better Auth user directly
   */
  async authenticateRequest(req: Request): Promise<User> {
    if (!auth) {
      throw ForbiddenError("Auth service unavailable");
    }

    try {
      // Get session from Better Auth
      const session = await auth.api.getSession({
        headers: req.headers as any,
      });

      if (!session?.user) {
        throw ForbiddenError("Not authenticated");
      }

      return session.user as User;
    } catch (error) {
      if (error instanceof Error && error.message.includes("Forbidden")) {
        throw error;
      }
      console.error("[Auth] Authentication failed:", error);
      throw ForbiddenError("Authentication failed");
    }
  }
}

export const sdk = new SDKServer();
