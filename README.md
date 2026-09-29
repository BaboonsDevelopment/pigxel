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
  src/app/                   Landing, login, tiles, editor, profiles, settings, auth callbacks
  src/components/            Editor canvas and tools, AI chat, app shell, profile UI
  src/lib/edit/, lib/image/  Pixel editing operations and picture-to-pixel-art pipeline
  src/lib/ai/                AI helper (Gemini)
  src/lib/profile/           Artist profiles: validation and queries
  src/lib/supabase/          Browser/server clients and configuration
  src/lib/paddle/            Server-only Paddle client (billing comes next)
  src/proxy.ts               Supabase session refresh when configured
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

- **Supabase:** set the public URL and publishable key. Local development requires Docker: `pnpm db:start` starts Supabase, and `pnpm db:stop` stops it. Apply the migrations in `supabase/migrations` (`pnpm exec supabase db push` for a linked project).
- **Gemini:** set `GEMINI_API_KEY` for the AI helper in the editor.
- **Paddle:** set the server API key and environment (defaults to `sandbox`). The server client is ready; add checkout, webhook verification, and subscription storage when implementing billing.

## Supabase Auth setup

1. In `apps/web/.env.local`, set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `APP_URL` (locally `http://localhost:3000`). Restart the dev server after changing these values.
2. In Supabase Auth, enable the Email provider and turn **Confirm email** off (Authentication → Sign In / Providers → Email). Signup then signs the user in immediately. Set Site URL to your app origin and allow `${APP_URL}/auth/callback?next=/auth/update-password` and `${APP_URL}/auth/confirm` as redirect URLs (replace `${APP_URL}` with the actual origin).
3. For password reset links that work across browsers, replace the **Reset password** email template with the contents of `supabase/templates/recovery.html`. Local Supabase already uses it.
4. Create an account at `/login?mode=signup`; you land on `/home` right away. Local reset emails are available at http://localhost:54324. Use a configured SMTP provider for production emails.
5. For email changes from Settings → Account, also allow `${APP_URL}/auth/callback?next=/settings/account`.

The session is kept in cookies and refreshed by `src/proxy.ts` on every page, so returning visitors of `/` or `/login` go straight to `/home`. The proxy redirects signed-out visitors of the signed-in pages to `/login` (the list lives in `src/lib/auth/routes.ts`), and each protected page verifies the user again on the server. Signup does not send a confirmation email. Password reset links that return to the landing page with a code are forwarded to the callback; open default reset links in the same browser that requested them. The forgot-password link is on `/login`. Recovery links open `/auth/update-password`; it verifies the user before changing their password and returning to Settings → Account.

## Profiles and settings

Every account gets a profile (`supabase/migrations/20260929120000_profiles.sql`) with a username, display name, description (up to 200 characters), up to three links, an avatar and a public/private setting. `/u/<username>` shows the profile, its art count, pinned arts (up to six) and published arts; `/profile` goes to your own. Tiles in Pigxel cloud stay private until published from the profile. `/settings` has Profile, Account (email, password, connected Google/Apple sign-in, Google Drive, sign-out), Subscription and Privacy tabs.

Apple sign-in is optional: it needs an Apple Developer account, the Apple provider enabled in Supabase, and `APPLE_CLIENT_ID` in `apps/web/.env.local`. Without it, the Apple buttons stay hidden.

Implementation follows [Supabase’s Next.js auth guide](https://supabase.com/docs/guides/getting-started/tutorials/with-nextjs).

## .pigxel files and Google Drive

`/tiles/new` sets up a tile: name, size (up to 256×256), background (transparent, white or black) and where to keep it: **Google Drive**, which creates the file in Drive and autosaves every change, or **Don’t store it**, which keeps it in the browser until it is downloaded or saved to Drive. The editor at `/tiles/edit?id=…` works on one tile at a time. Every tile you create or open gets its own draft in `localStorage` (per user), so it survives navigation and reloads and never replaces another tile; **Your tiles** lists them under “In this browser” next to the Pigxel cloud tiles. On a white or black tile the eraser paints the background.

The editor opens and saves `.pigxel` files: versioned JSON with the tile size and base64 RGBA pixels (see `apps/web/src/lib/pigxel-file/format.ts`). **Open** reads a file from the computer or Google Drive; **Save** downloads it or saves it to Google Drive. `Ctrl/⌘+S` saves back to where the tile came from, and `Ctrl/⌘+O` opens a file from the computer.

**File → Export…** (`Ctrl/⌘+E`) saves the tile as a picture, scaled up by a whole number (1–20×) so pixels stay sharp: a **PNG** or **JPEG** of the frame on screen (a JPEG goes on the tile's background, white when it is transparent), a looping **GIF** of every frame with their durations, or a **sprite sheet** PNG of every frame in a row, column or grid, optionally with a JSON file in Aseprite's format that game engines read. Hidden and reference layers are left out. The code is in `apps/web/src/lib/export/`; GIFs are encoded there without a library.

### Pigxel cloud

Tiles kept in **Pigxel cloud** (the default on `/tiles/new`) are stored in Supabase: the `.pigxel` file goes to the private `tiles` Storage bucket at `<user id>/<tile id>.pigxel`, and the `tiles` table holds the name, size, background and a small thumbnail for **Your tiles**. Row-level security on both limits each person to their own tiles, so the browser uses its normal session and no secret key is involved. Cloud tiles autosave like Drive ones; the editor can also move a tile between Pigxel cloud and Google Drive (**Save → Move to …**). Apply `supabase/migrations/20260928180000_tiles.sql` (SQL editor, or `supabase db push`) to create the table, bucket and policies.

### Google sign-in and Google Drive

People connect **their own** Google Drive through Supabase Auth: **Continue with Google** on the login page signs in and connects Drive at once, and people who signed up with email use **Connect Google Drive** (in Settings → Account, the new-tile form or the editor) to link a Google account (also possible under Settings → Account). Pigxel asks only for `drive.file`, so it can reach just the files it creates, and Google doesn’t require a security review.

Supabase hands over Google’s access token only once and doesn’t renew it, so `/auth/callback` stores the Google refresh token in `google_drive_connections` (RLS on, no policies: only the server’s secret key can read it). The browser asks `POST /api/google-drive/token` for a short-lived access token and talks to Drive directly, so autosave keeps working across reloads. **Disconnect Google Drive** in Settings → Account deletes the token and revokes Pigxel’s access at Google.

One-time setup:

1. In [Google Cloud Console](https://console.cloud.google.com/), create a project and enable the **Google Drive API**.
2. Configure the OAuth consent screen (External) and add the `.../auth/drive.file` scope, then **Publish app** (Audience → Publish app) so any Google account can connect. `drive.file` is non-sensitive, so publishing needs no security review, and it avoids Testing mode’s test-user list and 7-day token expiry.
3. Create an **OAuth client ID** (Web application). Add `https://<project-ref>.supabase.co/auth/v1/callback` (and `http://127.0.0.1:54321/auth/v1/callback` for local Supabase) as an authorized redirect URI.
4. In Supabase, enable **Authentication → Sign In / Providers → Google** with that client ID and secret, turn on **Allow manual linking**, and add `http://localhost:3000/auth/callback` (and each deployed `/auth/callback`) to the redirect URLs.
5. Apply `supabase/migrations/20260928160000_google_drive_connections.sql` (SQL editor, or `supabase db push`).
6. Set `SUPABASE_SECRET_KEY`, `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `apps/web/.env.local` and restart `pnpm dev`.

"Open from Google Drive" lists the `.pigxel` files Pigxel saved in the person’s Drive. Files uploaded to Drive by hand aren’t visible under `drive.file`; download them and open them from the computer.

## Checks

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm format:check
pnpm build
```

`pnpm format` formats the source. GitHub Actions runs the checks above. The auth tests cover successful/failed login, direct signup, password recovery, authenticated password changes, route guards, and safe redirects using mocked Supabase sessions. They do not create live accounts or send emails.
