# Pricing and purchase return (`/pricing`, `/welcome`)

The current implementation uses Creem. This replaces the former Paddle setup.

## Plans and purchase

- Free: all drawing tools, five cloud projects, no AI tokens.
- Artist: $5/month or $40/year, 75 cloud projects, no AI tokens, premium perks.
- Pro: three token levels represented internally as Starter (1,000 tokens,
  50 projects, $7/$50), Pro (2,000 tokens, 100 projects, $10/$75), and Advanced
  (7,000 tokens, 200 projects, $20/$150). Prices are monthly/yearly USD, plus tax.
- Creator remains an application/contact flow.
- Test and live API keys select separate matching Creem product IDs. Archived
  test products remain recognizable for existing subscriptions.
- Guests sign up before checkout. Subscribers change their existing plan.
- Creem returns to `/welcome`, showing the pig mascot and **Go back to Pigxel**.
  The page reads the actual subscription and waits while confirmation arrives;
  visiting the page does not grant membership. When `checkout_id` is present,
  the waiting state verifies the completed checkout and its current subscription
  through Creem’s server API, checks account ownership and billing environment,
  then stores the verified state. This recovers initial activation if a local
  webhook was missed; webhooks still keep subsequent billing events in sync.

## Paid benefits

- Premium assets and tutorials, badge gifting, and hiring portfolios are
  implemented. Badge gifting uses the sender's published artwork; recipients
  opt into public display. Member settings live at `/settings/perks`.
- Discord linking and role synchronization are implemented but external setup
  remains pending, so Discord stays marked **Soon** on pricing.
- Advanced has a priority support email entry point with account context.
  Mailbox triage and response-time commitments are operational responsibilities.
- Subscription settings shows actual cloud and AI usage. AI allowances reset
  on the first day of each month in UTC. Failed usage reads remain unknown.

Apply the new migrations and complete the integration checks in
[the production feature plan](../production-feature-plan.md) before deployment.
