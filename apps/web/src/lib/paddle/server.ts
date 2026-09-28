import "server-only";
import { Environment, Paddle } from "@paddle/paddle-node-sdk";

export function createPaddleClient() {
  const apiKey = process.env.PADDLE_API_KEY;
  const environment = process.env.PADDLE_ENVIRONMENT || "sandbox";

  if (!apiKey) throw new Error("PADDLE_API_KEY is required to use Paddle.");
  if (environment !== "sandbox" && environment !== "production") {
    throw new Error("PADDLE_ENVIRONMENT must be sandbox or production.");
  }

  return new Paddle(apiKey, {
    environment:
      environment === "production"
        ? Environment.production
        : Environment.sandbox,
  });
}
