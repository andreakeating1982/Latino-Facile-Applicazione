/**
 * Better Auth client configuration
 * Handles graceful fallback when auth backend isn't available
 */
import { createAuthClient } from "better-auth/react";

// Lazy initialization to avoid issues with SSR or missing window
let _authClient: ReturnType<typeof createAuthClient> | null = null;

function getAuthClient() {
  if (!_authClient && typeof window !== "undefined") {
    try {
      _authClient = createAuthClient({
        baseURL: window.location.origin,
      });
    } catch (error) {
      console.warn("[Auth] Failed to initialize auth client:", error);
    }
  }
  return _authClient;
}

// Export a proxy that lazily initializes the auth client
export const authClient = new Proxy({} as ReturnType<typeof createAuthClient>, {
  get(_, prop) {
    const client = getAuthClient();
    if (!client) {
      // Return no-op functions for methods
      if (prop === "signIn" || prop === "signUp" || prop === "signOut") {
        return () => Promise.resolve({ error: { message: "Auth not available" } });
      }
      if (prop === "useSession") {
        // Return a mock hook that indicates no session
        return () => ({
          data: null,
          isPending: false,
          error: null,
          refetch: () => Promise.resolve(),
        });
      }
      return undefined;
    }
    return (client as any)[prop];
  },
});

// Export hooks and functions that use the lazy client
export const signIn = (...args: Parameters<ReturnType<typeof createAuthClient>["signIn"]["email"]>) => {
  const client = getAuthClient();
  return client ? client.signIn.email(...args) : Promise.resolve({ error: { message: "Auth not available" } });
};

export const signUp = (...args: Parameters<ReturnType<typeof createAuthClient>["signUp"]["email"]>) => {
  const client = getAuthClient();
  return client ? client.signUp.email(...args) : Promise.resolve({ error: { message: "Auth not available" } });
};

export const signOut = () => {
  const client = getAuthClient();
  return client ? client.signOut() : Promise.resolve();
};

export const useSession = () => {
  const client = getAuthClient();
  if (!client) {
    // Return a static response when auth isn't available
    return {
      data: null,
      isPending: false,
      error: null,
      refetch: () => Promise.resolve(),
    };
  }
  return client.useSession();
};
