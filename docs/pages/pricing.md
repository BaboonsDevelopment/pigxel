# Pricing and welcome (`/pricing`, `/welcome`)

Plans, prices and checkout, and the page people land on after paying.

**Who can open it:** everyone.

## Pricing (`/pricing`)

### Plans

- ✅ Four plans side by side: Free, Starter, Pro (recommended), Advanced.
- ✅ Monthly or yearly, with yearly savings shown when the prices allow it.
- ✅ Prices in the visitor's local currency and with tax, from Paddle; "Price unavailable" if Paddle can't be reached.
- ✅ Facts: cancel anytime, refunds within 14 days, Paddle handles payments and VAT, your art stays yours; links to Terms, Privacy and Refunds.

### Buying

- ✅ Guests see "Sign up to subscribe": sign up, then come back to Pricing.
- ✅ Signed-in people without a plan: "Subscribe" opens Paddle checkout over the page.
- ✅ Subscribers see "Your plan" on their current plan and "Change plan" on the others (opens [Subscription settings](settings.md) with that plan chosen). Nobody can buy a second subscription.

### What each plan includes

| Plan     | Advertised today                                                                               | Status                                    |
| -------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Free     | Every drawing tool, layers and frames, palettes, exports, cloud or Drive, a few AI generations | ✅                                        |
| Starter  | More AI every month, more cloud room, premium badge                                            | 🔨 Badge works; AI and storage limits ❓  |
| Pro      | Many more AI generations and animations, much more room, early access                          | 🔨 Limits ❓; early access not defined ❓ |
| Advanced | The most AI and room, priority support                                                         | 🔨 Limits ❓; priority support process ❓ |

- ❓ **Plan limits:** AI credits per plan and month, cloud storage per plan, whether credits reset monthly (recommended) and whether unused credits carry over (recommended: no).
- 📋 Add "Paid assets and packs" to the paid plans once [Assets](assets.md) supports it.
- 📋 Credits are reserved before each AI call, so two calls at once can't overspend (built together with plan limits).

## Welcome (`/welcome`)

- ✅ Checks the real plan: "Welcome to Pro — your plan is active" once Paddle confirms.
- ✅ While waiting for Paddle (usually a few seconds): "Finishing your subscription…", checking every 2 seconds for up to 30 seconds.
- ✅ If Paddle hasn't confirmed by then: explains the plan will appear in Settings within minutes, and Paddle emails the receipt.
- ✅ Guests are asked to log in to see their plan. Visiting this page never grants a plan.
- ✅ Hidden from search engines.

## Behind the scenes

- ✅ Paddle webhook keeps subscriptions up to date (signed, ignores out-of-order events).
- ✅ Downgrades are applied an hour or two before renewal by an hourly Supabase job.
