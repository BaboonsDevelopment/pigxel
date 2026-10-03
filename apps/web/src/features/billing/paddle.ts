import type { Environments } from "@paddle/paddle-js";

type Env = Record<string, string | undefined>;

export function paddleEnvironment(env: Env = process.env): Environments {
  const value = env.PADDLE_ENVIRONMENT;
  if (value !== "sandbox" && value !== "production") {
    throw new Error(
      `PADDLE_ENVIRONMENT must be "sandbox" or "production", got ${value ? `"${value}"` : "nothing"}. Set it in apps/web/.env.local.`,
    );
  }
  return value;
}

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

export function countryFromHeaders(headers: Pick<Headers, "get">) {
  const code = (
    headers.get("x-vercel-ip-country") ?? headers.get("cf-ipcountry")
  )
    ?.trim()
    .toUpperCase();
  if (!code || !/^[A-Z]{2}$/.test(code) || code === "XX") return undefined;
  return code;
}
