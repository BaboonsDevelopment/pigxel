import "server-only";

export function authUrl(path: string) {
  const url = new URL(process.env.APP_URL || "http://localhost:3000");
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("APP_URL must be an HTTP or HTTPS URL.");
  }
  return new URL(path, url.origin).toString();
}
