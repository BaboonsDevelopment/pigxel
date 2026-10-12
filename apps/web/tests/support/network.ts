/**
 * Every HTTP request in unit and component tests goes through this mock
 * server. A request no handler answers fails the test, even when app code
 * catches the error, so tests never reach real services by accident.
 *
 *   server.use(http.post("https://api.example.com/x", () => HttpResponse.json({})));
 */
import { setupServer } from "msw/node";

export const server = setupServer();

const unanswered: string[] = [];

export function guardNetwork() {
  server.listen({
    onUnhandledRequest(request) {
      if (!/^https?:/.test(request.url)) return;
      unanswered.push(`${request.method} ${request.url}`);
      throw new Error(`No mock for ${request.method} ${request.url}`);
    },
  });
}

/** Throws if the finished test tried to reach the network. */
export function checkNetwork() {
  server.resetHandlers();
  if (!unanswered.length) return;
  const requests = unanswered.splice(0).join("\n  ");
  throw new Error(
    `Unmocked network requests (add a handler with server.use()):\n  ${requests}`,
  );
}
