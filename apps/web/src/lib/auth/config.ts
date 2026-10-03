import "server-only";
import { safeNext } from "./routes";

export const OAUTH_PROVIDER_PARAM = "provider";
export type OAuthProvider = "google" | "apple";

/** Keep the provider on the return URL so OAuth errors don't look like recovery errors. */
export function oauthCallbackUrl(provider: OAuthProvider, next: string) {
  const url = new URL(authUrl("/auth/callback"));
  url.searchParams.set("next", safeNext(next));
  url.searchParams.set(OAUTH_PROVIDER_PARAM, provider);
  return url.toString();
}

export function authUrl(path: string) {
  const url = new URL(process.env.APP_URL || "http://localhost:3000");
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("APP_URL must be an HTTP or HTTPS URL.");
  }
  return new URL(path, url.origin).toString();
}
