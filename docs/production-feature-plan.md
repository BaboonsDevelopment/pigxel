# Production feature plan

Scope: all seven features requested on October 19, 2026. Existing editor,
account deletion, data export, tutorial completion, and premium asset access
remain part of the working product, rather than new backlog items.

Implementation checkboxes below describe the working tree, not a production
deployment. Database permission tests and visual/integration review remain
release gates. The user has a Discord channel but no application/bot/role
configuration yet. Tutorial recordings are optional and are not a launch prerequisite.

## 1. Subscription usage and priority support

- [x] Show cloud projects used, remaining, and the plan limit in Settings → Subscription.
- [x] Show AI tokens used, remaining, and the monthly reset date from existing metering.
- [x] Show unavailable data honestly instead of reporting zero usage on errors.
- [x] Give Advanced subscribers a priority support entry point with account context.
- [x] Verify plan limits, Artist/Free usage, over-limit accounts, and query failures in unit/component tests.

## 2. Feedback management

- [x] Let admins change feedback statuses on the board; enforce permissions server-side.
- [x] Record status changes and notify the author in the app.
- [x] Prevent duplicate notifications when the status does not change.
- [ ] Verify unauthorized attempts, valid transitions, and notification links.

## 3. Giftable badges and hiring portfolios

- [x] Let paid members gift a named badge to another artist, with an optional message.
- [x] Let recipients display or hide received badges on their public profile.
- [x] Let paid members publish a hiring profile with availability, contact details, and portfolio work.
- [x] Add portfolio editing, previews, and accessible move-up/move-down ordering.
- [x] Confirm permanent badge/project removal and preserve the option to hide gifts.
- [x] Add payment-confirmation retries, feedback save/error states, and a Member perks entry point from Subscription.
- [x] Respect profile privacy, validate links, and enforce ownership and entitlements on the server.
- [ ] Verify free/paid access, gifting to oneself, unknown recipients, and private profiles.

## 4. Discord premium roles

- [x] Add Discord account linking and unlinking with OAuth state protection.
- [x] Implement role grants/removals driven by the current subscription.
- [x] Retry role synchronization after failures and show connection state in Settings.
- [ ] Create/configure the actual application, bot, and server role, then verify the integration.
- [x] Test OAuth state/session failures, billing environment separation, role API errors, disconnect cleanup, and stale responses with mocked services.
- [ ] Verify subscription expiry and bot permissions against the real Discord server.

External setup: Discord application, bot, server, and the Artist, Pro and
Creator roles. Configure `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`,
`DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`, `DISCORD_ARTIST_ROLE_ID`,
`DISCORD_PRO_ROLE_ID` and optionally `DISCORD_CREATOR_ROLE_ID` outside Git. The
bot needs permission to manage roles, and its own role must be above Artist and Pro.

## 5. Tutorial videos

- [x] Make recordings optional; show guides without video players, placeholders, or “Video soon” labels when no recording is attached.
- [x] Add admin controls to attach/remove valid YouTube links without code changes.
- [x] Only show a playable video when a valid video ID exists; gate premium lesson videos.
- [x] Test missing videos, attached recordings, and premium playback access with component/page tests.
- [ ] Verify playback for any real recordings when attached; review completion tracking in the browser.

Optional future input: actual recordings or YouTube links for selected lessons.
Guides can launch without them.

## Release criteria

- [ ] Apply the new database migrations in the intended environment.
- [ ] Run relevant behavior and permission tests, TypeScript, lint, and the production build.
- [ ] Review the UI at mobile and desktop widths.
- [ ] Remove each pricing “Soon” label only when that feature is usable.
- [x] Update page specifications to describe the implementation and remaining dependencies.

## Validation so far

- Production build passed (existing Geist Pixel fallback-font warning).
- TypeScript passed. New action, usage, URL, notification, and Discord tests
  exercise success and failure paths without contacting external services.
- Focused regression checks passed 153 tests. Application and test lint passed
  (`eslint src tests`).
- The broad test run passed 704 tests. Its remaining failed suite requires the
  missing `apps/web/scripts/assets/packs` source directory.
- Repository-wide lint is blocked by existing `require()` import errors in
  `scripts/assets/fix-animation-alignment.cjs` and its test file.
- Database integration tests were added under `tests/db/member-perks.test.ts`.
  Docker/local Supabase is not running, so those tests have not been executed.
- Hosted migrations, live Discord tests, optional video playback, and visual QA
  remain pending. Do not treat this checklist as production sign-off.

Priority support routing can be implemented in the app; actual response-time
commitments and mailbox triage remain an operational responsibility.

## Non-Discord polish

- Optional lesson videos have list/detail coverage for missing recordings,
  attached recordings, and premium access. No-video lessons keep working guides.
- Portfolio edit/reorder schema and permission checks are in migration
  `20261019170000_portfolio_editing.sql`. Apply it before deploying this UI.
- Payment confirmation offers a fresh attempt after timeout without encouraging
  a second purchase. Member action and feedback failures stay visible and retryable.
- Database integration tests include owner/foreign-user/free-plan edits and
  malformed reorder requests. Local Docker/Supabase is still required to run them.

- Badge message privacy is enforced at the database column level in migration
  `20261019180000_private_badge_messages.sql`. Public profile queries never
  request messages; a recipient-only function supplies them in Member perks.

Validation of the polish pass: 83 targeted tests passed, TypeScript passed,
`eslint src tests` passed, and the production build passed (existing Geist
Pixel fallback warning). The broader run passed 735 tests and retained the
existing missing asset-pack directory suite failure. Database permission tests
could not start because local Supabase is offline. Browser visual QA remains
pending; no browser execution tool was available in this session.
