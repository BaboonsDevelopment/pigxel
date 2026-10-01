import "server-only";
import { Environment, Paddle } from "@paddle/paddle-node-sdk";
import { paddleEnvironment } from "./config";

export function createPaddleClient() {
  const apiKey = process.env.PADDLE_API_KEY;
  if (!apiKey) throw new Error("PADDLE_API_KEY is required to use Paddle.");

  return new Paddle(apiKey, {
    environment:
      paddleEnvironment() === "production"
        ? Environment.production
        : Environment.sandbox,
  });
}
