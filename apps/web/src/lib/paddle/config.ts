import type { Environments } from "@paddle/paddle-js";

type Env = Record<string, string | undefined>;

/**
 * The Paddle environment from `PADDLE_ENVIRONMENT`. There is no default:
 * an unset or unknown value throws, so Pigxel never talks to the wrong
 * Paddle account.
 */
export function paddleEnvironment(env: Env = process.env): Environments {
  const value = env.PADDLE_ENVIRONMENT;
  if (value !== "sandbox" && value !== "production") {
    throw new Error(
      `PADDLE_ENVIRONMENT must be "sandbox" or "production", got ${value ? `"${value}"` : "nothing"}. Set it in apps/web/.env.local.`,
    );
  }
  return value;
}

/**
 * What Paddle.js needs in the browser: the environment and a client-side
 * token, which must belong to it (`test_` for sandbox, `live_` for
 * production). Client-side tokens are public; the API key never leaves the
 * server.
 */
export function paddleClientConfig(env: Env = process.env) {
  const environment = paddleEnvironment(env);
  const token = env.PADDLE_CLIENT_TOKEN;
  const prefix = environment === "sandbox" ? "test_" : "live_";
  if (!token?.startsWith(prefix)) {
    throw new Error(
      `PADDLE_CLIENT_TOKEN must be a ${environment} client-side token starting with "${prefix}". Create one in Paddle under Developer tools → Authentication.`,
    );
  }
  return { environment, token };
}

/**
 * The visitor's country as an ISO code from the host's geo header (Vercel,
 * or Cloudflare in front). Undefined when it's missing or unknown, so
 * Paddle detects the country from the visitor's IP instead.
 */
export function countryFromHeaders(headers: Pick<Headers, "get">) {
  const code = (
    headers.get("x-vercel-ip-country") ?? headers.get("cf-ipcountry")
  )
    ?.trim()
    .toUpperCase();
  // Cloudflare sends XX for an unknown country.
  if (!code || !/^[A-Z]{2}$/.test(code) || code === "XX") return undefined;
  return code;
}
