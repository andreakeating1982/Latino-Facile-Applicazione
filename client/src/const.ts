export { ONE_YEAR_MS, AXIOS_TIMEOUT_MS } from "@shared/const";

// Optional: Auth helper for apps that use authentication
// Better Auth is available at /api/auth/* if you need user accounts
export function getLoginUrl(): string {
  return "/login";
}
