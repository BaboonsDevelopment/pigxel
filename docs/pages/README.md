# Pigxel pages: features per page

One file per page (closely related routes share a file). Each file lists everything the page should do: what is built, what is planned, and what still needs a product decision. For implementation detail and acceptance criteria, see [product-technical-requirements.md](../product-technical-requirements.md).

Last updated: October 5, 2026.

## Status legend

| Mark | Meaning                                               |
| ---- | ----------------------------------------------------- |
| ✅   | Built and working                                     |
| 🔨   | Partly built, or the UI exists but isn't wired up yet |
| 📋   | Planned: decided, not built yet                       |
| ❓   | Needs a product decision before it can be built       |

## Pages

| Page                      | URL                                                          | Who can open it                        | File                                   |
| ------------------------- | ------------------------------------------------------------ | -------------------------------------- | -------------------------------------- |
| Landing                   | `/`                                                          | Everyone (signed-in people go to Home) | [landing.md](landing.md)               |
| Log in, sign up, password | `/login`, `/auth/update-password`                            | Everyone                               | [auth.md](auth.md)                     |
| Home                      | `/home`                                                      | Signed in                              | [home.md](home.md)                     |
| My projects               | `/tiles`                                                     | Signed in                              | [my-projects.md](my-projects.md)       |
| New tile                  | `/tiles/new`                                                 | Signed in                              | [new-tile.md](new-tile.md)             |
| Editor                    | `/tiles/edit`                                                | Signed in                              | [editor.md](editor.md)                 |
| Explore                   | `/explore`                                                   | Everyone                               | [explore.md](explore.md)               |
| Assets                    | `/assets`                                                    | Signed in (📋 everyone)                | [assets.md](assets.md)                 |
| Tutorials                 | `/tutorials`, `/tutorials/[slug]`                            | Signed in                              | [tutorials.md](tutorials.md)           |
| Artist profile            | `/u/[username]`, `/profile`                                  | Everyone (public profiles)             | [artist-profile.md](artist-profile.md) |
| Settings                  | `/settings/profile`, `/account`, `/privacy`, `/subscription` | Signed in                              | [settings.md](settings.md)             |
| Pricing and welcome       | `/pricing`, `/welcome`                                       | Everyone                               | [pricing.md](pricing.md)               |
| Patch notes               | `/patch-notes`                                               | Signed in                              | [patch-notes.md](patch-notes.md)       |
| Feedback                  | `/feedback`, `/feedback/new`                                 | Signed in                              | [feedback.md](feedback.md)             |
| Legal                     | `/terms`, `/privacy`, `/refunds`                             | Everyone                               | [legal.md](legal.md)                   |
| Page not found            | any unknown URL                                              | Everyone                               | [not-found.md](not-found.md)           |

## On every page

### App shell (signed in)

- ✅ Sidebar: Home, My projects, Explore, Assets, Tutorials, and the latest patch notes.
- ✅ Account menu: profile, settings, pricing, feedback, sign out; shows the current plan.
- ✅ Search: your projects (browser and cloud) and artists; `@name` searches usernames.
- ✅ Notifications bell: new followers, with unread count; says so when it can't load.
- ✅ Small screens get a navigation layout that fits.

### Public header (guests)

- ✅ Pigxel logo, Explore, Pricing, Log in; a sign-up prompt as you scroll.

### Rules that apply everywhere

- ✅ Lists say "Couldn't load…" when the database fails, never a misleading empty state.
- ✅ After signing in from a page (for example Pricing or a profile), people come back to that page.
- 📋 Share previews (Open Graph images) and a sitemap for public pages: Explore, artist profiles, Assets.

## Plans and what they unlock

| Feature                               | Free            | Paid plans (Starter, Pro, Advanced) |
| ------------------------------------- | --------------- | ----------------------------------- |
| Every drawing tool, export, timelapse | ✅              | ✅                                  |
| Pigxel cloud and Google Drive         | ✅              | ✅ (more room ❓)                   |
| AI credits                            | ✅ trial amount | ❓ amount per plan, monthly reset   |
| Premium badge on profile              | —               | ✅                                  |
| Free assets and packs                 | 📋              | 📋                                  |
| Paid assets and packs                 | —               | 📋                                  |
