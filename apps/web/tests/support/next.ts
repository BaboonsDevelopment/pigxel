/**
 * Stand-ins for Next.js runtime pieces that only exist inside a request.
 *
 *   vi.mock("next/navigation", async () =>
 *     (await import("@test/next")).navigationModule);
 *
 *   await expect(action()).rejects.toThrow(redirectTo("/login"));
 */
import { vi } from "vitest";

/** Thrown by the mocked redirect(); the message names the destination. */
class RedirectError extends Error {
  constructor(url: string) {
    super(`NEXT_REDIRECT ${url}`);
  }
}

class NotFoundError extends Error {
  constructor() {
    super("NEXT_NOT_FOUND");
  }
}

/** Matches the error thrown by redirect(url), for toThrow(). */
export const redirectTo = (url: string) => new RedirectError(url).message;

/** What the mocked hooks return; tests may change it, setup resets it. */
export const navigation = {
  pathname: "/",
  searchParams: new URLSearchParams(),
  params: {} as Record<string, string | string[]>,
  router: {
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  },
  reset() {
    this.pathname = "/";
    this.searchParams = new URLSearchParams();
    this.params = {};
    Object.values(this.router).forEach((fn) => fn.mockReset());
  },
};

export const navigationModule = {
  redirect: (url: string): never => {
    throw new RedirectError(url);
  },
  permanentRedirect: (url: string): never => {
    throw new RedirectError(url);
  },
  notFound: (): never => {
    throw new NotFoundError();
  },
  useRouter: () => navigation.router,
  usePathname: () => navigation.pathname,
  useSearchParams: () => navigation.searchParams,
  useParams: () => navigation.params,
};
