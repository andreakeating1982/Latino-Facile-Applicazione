import { useCallback, useEffect, useMemo } from "react";
import { authClient, useSession, signOut } from "@/lib/auth-client";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = "/login" } =
    options ?? {};

  const { data: session, isPending, error, refetch } = useSession();

  const logout = useCallback(async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("[Auth] Logout failed:", error);
    }
  }, []);

  const state = useMemo(() => {
    // Store user info for runtime compatibility
    if (session?.user) {
      localStorage.setItem(
        "auth-user-info",
        JSON.stringify(session.user)
      );
    } else {
      localStorage.removeItem("auth-user-info");
    }

    return {
      user: session?.user ?? null,
      loading: isPending,
      error: error ?? null,
      isAuthenticated: Boolean(session?.user),
    };
  }, [session, isPending, error]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (isPending) return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    if (window.location.pathname === redirectPath) return;
    if (window.location.pathname.startsWith("/api/auth")) return;

    window.location.href = redirectPath;
  }, [redirectOnUnauthenticated, redirectPath, isPending, state.user]);

  return {
    ...state,
    refresh: refetch,
    logout,
    // Expose Better Auth functions for direct use
    signIn: authClient.signIn,
    signUp: authClient.signUp,
  };
}
