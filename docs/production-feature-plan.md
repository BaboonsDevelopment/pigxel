# Production feature plan

Scope: all seven features requested on October 19, 2026. Existing editor,
account deletion, data export, tutorial completion, and premium asset access
remain part of the working product, rather than new backlog items.

Implementation checkboxes below describe the working tree, not a production
deployment. Database permission tests and visual/integration review remain
release gates. The user has a Discord channel but no application/bot/role
configuration or tutorial recordings yet.

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
- [x] Respect profile privacy, validate links, and enforce ownership and entitlements on the server.
- [ ] Verify free/paid access, gifting to oneself, unknown recipients, and private profiles.

## 4. Discord premium roles

- [x] Add Discord account linking and unlinking with OAuth state protection.
- [x] Implement role grants/removals driven by the current subscription.
- [x] Retry role synchronization after failures and show connection state in Settings.
- [ ] Create/configure the actual application, bot, and server role, then verify the integration.
- [x] Test OAuth state/session failures, billing environment separation, role API errors, disconnect cleanup, and stale responses with mocked services.
- [ ] Verify subscription expiry and bot permissions against the real Discord server.

External setup: Discord application, bot, server, and premium role. Configure
`DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_BOT_TOKEN`,
`DISCORD_GUILD_ID`, and `DISCORD_PREMIUM_ROLE_ID` outside Git. The bot needs
permission to manage the premium role, and its own role must be higher.

## 5. Tutorial videos

- [ ] Attach recorded lesson videos and retain interactive guides alongside them.
- [x] Add admin controls to attach/remove valid YouTube links without code changes.
- [x] Only show a playable video when a valid video ID exists; gate premium lesson videos.
- [ ] Verify playback, missing videos, lesson access, and completion tracking.

External input: actual video recordings or YouTube links for the lessons. Do
not invent video URLs or replace lessons with unrelated recordings.

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
- Hosted migrations, live Discord tests, actual video playback, and visual QA
  remain pending. Do not treat this checklist as production sign-off.

Priority support routing can be implemented in the app; actual response-time
commitments and mailbox triage remain an operational responsibility.
