# Testing

Pigxel has four layers of tests. Most changes need only the first two, which run in a few seconds without any services.

| Layer      | What it checks                                                  | Where                                               | Command         | Needs          |
| ---------- | --------------------------------------------------------------- | --------------------------------------------------- | --------------- | -------------- |
| Unit       | Logic, server actions, route handlers, server-rendered markup   | `apps/web/tests/**/*.test.ts`                       | `pnpm test`     | Nothing        |
| Component  | Client components and pages in a simulated browser (jsdom)      | `apps/web/tests/**/*.test.tsx`, `packages/ui/test/` | `pnpm test`     | Nothing        |
| Database   | Row-level security, triggers and functions on the real database | `apps/web/tests/db/`                                | `pnpm test:db`  | Local Supabase |
| End-to-end | Real flows in Chromium against a production build of the app    | `apps/web/e2e/`                                     | `pnpm test:e2e` | Local Supabase |

## Running tests

```sh
pnpm test                 # unit and component tests in every package
pnpm test:coverage        # the same, with coverage (apps/web/coverage/index.html)
pnpm --filter @pigxel/web test:watch

pnpm db:start             # once: local Supabase in Docker
pnpm test:db              # database tests
pnpm test:e2e             # builds the app, starts it on :3100, runs the browser tests
```

One file or test:

```sh
cd apps/web
pnpm exec vitest run tests/auth.test.ts
pnpm exec vitest run -t "rejects malformed ids"
pnpm exec playwright test e2e/guest/auth.spec.ts
pnpm exec playwright test --ui          # pick and watch tests in Playwright's UI
pnpm exec playwright show-report        # the last run's report, with traces of failures
```

End-to-end runs build the app into `.next-e2e/`, so they never touch your own `.next` or dev server. Two faster modes for writing tests:

- `pnpm --filter @pigxel/web test:e2e:dev` runs against the dev server instead of a build.
- `pnpm --filter @pigxel/web test:e2e:serve` keeps a test server running in one terminal; `pnpm test:e2e` in another reuses it.

## Tests never touch the hosted Supabase

`apps/web/.env` and `.env.local` point at the hosted project. Database and end-to-end tests create and delete accounts, so they only ever use local Supabase:

- Connection details come from `supabase status`, and anything that isn't on this machine is refused (`apps/web/tests/support/local-supabase.ts`).
- The end-to-end server gets every variable from the env files set explicitly: Supabase points at the local one, everything else is blank. Paddle gets placeholder sandbox values because the pricing page needs them (`apps/web/e2e/support/server.ts`).
- The test browser blocks every request that isn't to the app or local Supabase.
- Unit and component tests fail if they make any HTTP request that no mock answers, even when the app code catches the error.

## Unit and component tests

`*.test.ts` files run in Node; `*.test.tsx` files run in jsdom with [Testing Library](https://testing-library.com/docs/react-testing-library/intro/). Query by role and label, like a person would: `screen.getByRole("button", { name: "Log in" })`.

Every test file already has `server-only`, `next/font/google`, `next/image` and the pixel fonts mocked. Mocks, `vi.stubEnv` and `vi.stubGlobal` are reset after each test.

### Helpers

Import them from `@test/…` (`apps/web/tests/support/`).

**`@test/supabase`**: an in-memory Supabase client. Queries can be chained in any order; each resolves to the answer you set for its table, function or storage bucket, and is recorded.

```ts
vi.mock(
  "@/lib/supabase/server",
  async () => (await import("@test/supabase")).supabaseModules.server,
);

beforeEach(stubSupabaseEnv); // the app checks these before using Supabase

it("files a report", async () => {
  supabase.signIn(aUser());
  supabase.respond("comment_reports.insert", { error: null });
  await reportComment(id);
  expect(supabase.callsTo("comment_reports.insert")[0]).toMatchObject({
    values: { comment_id: id },
  });
});
```

- Targets: `"tiles"` (any query), `"tiles.insert"`, `"rpc:search_public_tiles"`, `"storage:assets"`, `"storage:assets.upload"`.
- `respond` answers until the test ends; `respondOnce` answers the next call only. An answer can be a function of the call.
- `single()` and `maybeSingle()` shape answers the way PostgREST does.
- `supabase.auth.*` are `vi.fn`s that follow who is signed in; override one with `mockResolvedValueOnce`.
- `supabaseModules` also has `browser`, `admin` and `ssr` (for `@supabase/ssr`, used by the proxy).
- The fake doesn't filter rows or apply row-level security. Test that in `tests/db`.

**`@test/next`**: `navigationModule` replaces `next/navigation`. `redirect()` throws, so assert with `rejects.toThrow(redirectTo("/login"))`. Hooks read from `navigation`, which you can change in a test (`navigation.pathname = "/explore"`).

**`@test/network`**: answer HTTP requests with [MSW](https://mswjs.io/docs/http):

```ts
server.use(http.post(/\/models\/gemini-x:generateContent$/, () => HttpResponse.json({ … })));
```

**`@test/render`**: `renderWithUser(<Component />)` renders and returns a [user-event](https://testing-library.com/docs/user-event/intro) session (`user.type`, `user.click`). `renderServerComponent(Page, { searchParams })` awaits an async page and renders the result; pages with nested async components need end-to-end tests instead.

### What jsdom lacks

`@pigxel/vitest-config/polyfills` adds what Pigxel components use and jsdom doesn't have: `<dialog>` (`showModal`, Escape, focus), `ResizeObserver`, `IntersectionObserver`, `matchMedia`, `scrollIntoView` and pointer capture. `canvas.getContext()` returns `null`; stub it in tests that draw.

## Database tests

They sign people up on local Supabase and check what the database allows them to do.

```ts
import { aTile, admin, guest, signUp } from "./helpers";

it("can't be changed by other people", async () => {
  const owner = await signUp("owner");
  const other = await signUp("other");
  const { data } = await owner.client
    .from("tiles")
    .insert(aTile())
    .select("id")
    .single();
  const update = await other.client
    .from("tiles")
    .update({ name: "x" })
    .eq("id", data!.id)
    .select();
  expect(update.data).toEqual([]);
});
```

- `signUp(name)` creates a confirmed account and a client signed in as it. The account and everything it owns are deleted after the test.
- `guest()` is a signed-out client. `admin` uses the secret key and bypasses row-level security, as server code does.
- Row-level security hides rows rather than failing: a blocked update or delete returns no rows and no error.

## End-to-end tests

- `e2e/guest/*.spec.ts` run signed out. Add `@mobile` to a test's name to also run it on a Pixel 7.
- `e2e/signed-in/*.spec.ts` run as one account that `e2e/auth.setup.ts` creates once per run. Don't sign out in these tests: they share the session.
- Import `test` and `expect` from `e2e/support/fixtures.ts`. Its fixtures give a test `account` (a fresh account, deleted afterwards) or `newAddress` (an unused email for sign-up tests), and `logIn(page, account)` fills in the login form. A test fails if the page throws an uncaught error.
- Test accounts use `@e2e.pigxel.test` and are deleted at the end of the run.

## Coverage

`apps/web/vitest.config.ts` sets floors just under the current coverage (about 32% of lines), so a change can't lower it. Raise them as tests are added. The least covered areas are settings (4% of lines), tiles (10%), landing (10%), explore (14%), AI (15%) and the editor (24% of about 6,600 lines); `src/lib` is at 66%.

## CI

`.github/workflows/ci.yml` runs three jobs in parallel:

- **Format, lint, types and build**: `format:check`, `lint`, `knip`, `typecheck`, `build`.
- **Unit and component tests**: `test:coverage`, with a coverage table in the job summary and the HTML report as an artifact.
- **Database and end-to-end tests**: starts local Supabase in Docker, then runs `test:db` and `test:e2e`. When it fails, the Playwright report with traces is uploaded as an artifact.

## Good to know

- `next build` type-checks the test files too, so a type error in a test fails the build.
- Tailwind scans every file that isn't gitignored for class names. Keep generated output (reports, builds) gitignored, or builds slow down and pick up junk classes.
- knip fails CI on unused exports, test helpers included. Export a helper when a test uses it.
