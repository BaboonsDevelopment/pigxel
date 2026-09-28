# Pigxel

A minimal pnpm + Turborepo workspace for a pixel-art app with an AI helper.

## Start

Use Node.js 24 (`.nvmrc`) and pnpm 10.33.2.

```sh
pnpm install
pnpm dev
```

Open http://localhost:3000. The landing page works without credentials. Connect Supabase to enable email/password login and signup.

## Structure

```text
apps/web/                    Next.js App Router + TypeScript
  src/app/                   Landing, login/signup, account, auth callbacks
  src/lib/supabase/          Browser/server clients and configuration
  src/lib/paddle/            Server-only Paddle client
  src/proxy.ts              Supabase session refresh when configured
packages/ui/                 Tailwind theme, shadcn configuration, cn utility
packages/typescript-config/  Shared TypeScript settings
packages/eslint-config/      Shared ESLint settings
supabase/                    Local configuration and password reset email template
```

Add product features in `apps/web` as they are developed. Extract shared logic into a package when there is a concrete need. Future mobile, desktop, and extension apps can live under `apps/`; React Native would use its own UI.

## UI components

Tailwind CSS and shadcn/ui are configured with a neutral theme. Button and input components are included for the auth form. Add more from the web workspace:

```sh
cd apps/web
pnpm dlx shadcn@latest add dialog
```

Shared components go into `packages/ui` through the configured aliases.

## Services

Copy `apps/web/.env.example` to `apps/web/.env.local` when connecting services.

- **Supabase:** set the public URL and publishable key. Local development requires Docker: `pnpm db:start` starts Supabase, and `pnpm db:stop` stops it. Email/password login, signup (no email confirmation), password recovery, session refresh, and sign-out are implemented. `/account` verifies the user on the server.
- **Paddle:** set the server API key and environment (defaults to `sandbox`). The server client is ready; add checkout, webhook verification, and subscription storage when implementing billing.

There are no application database tables, payment endpoints, editor code, or AI provider integrations yet. No remote services are provisioned.

## Supabase Auth setup

1. In `apps/web/.env.local`, set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `APP_URL` (locally `http://localhost:3000`). Restart the dev server after changing these values.
2. In Supabase Auth, enable the Email provider and turn **Confirm email** off (Authentication → Sign In / Providers → Email). Signup then signs the user in immediately. Set Site URL to your app origin and allow `${APP_URL}/auth/callback?next=/auth/update-password` and `${APP_URL}/auth/confirm` as redirect URLs (replace `${APP_URL}` with the actual origin).
3. For password reset links that work across browsers, replace the **Reset password** email template with the contents of `supabase/templates/recovery.html`. Local Supabase already uses it.
4. Create an account at `/login?mode=signup`; you land on `/tiles` right away. Local reset emails are available at http://localhost:54324. Use a configured SMTP provider for production emails.

Successful authentication opens `/tiles`, which has the **Create tile** button; `/account` shows the signed-in email and a sign-out button. The session is kept in cookies and refreshed by `src/proxy.ts` on every page, so returning visitors of `/` or `/login` go straight to `/tiles`. The proxy redirects signed-out visitors of `/tiles`, `/account`, and `/auth/update-password` to `/login` (the list lives in `src/lib/auth/routes.ts`), and each protected page verifies the user again on the server. No service-role key or custom database migration is required for authentication. Signup does not send a confirmation email. Password reset links that return to the landing page with a code are forwarded to the callback; open default reset links in the same browser that requested them. The forgot-password link is on `/login`. Recovery links open `/auth/update-password`; it verifies the user before changing their password and returning to `/account`. OAuth is not enabled.

Implementation follows [Supabase’s Next.js auth guide](https://supabase.com/docs/guides/getting-started/tutorials/with-nextjs).

## Checks

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm format:check
pnpm build
```

`pnpm format` formats the source. GitHub Actions runs the checks above. The auth tests cover successful/failed login, direct signup, password recovery, authenticated password changes, route guards, and safe redirects using mocked Supabase sessions. They do not create live accounts or send emails.
