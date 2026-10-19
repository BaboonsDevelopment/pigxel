# Settings (`/settings/…`)

Five tabs: Profile, Account, Subscription, Member perks, Privacy. `/settings` opens Profile.

**Who can open it:** signed-in people.

## Profile (`/settings/profile`)

- ✅ Avatar: none, the one from Google or Apple, or upload your own (up to 1 MB).
- ✅ Username: 3–20 lowercase letters, digits or underscores, unique, reserved names blocked.
- ✅ Display name (up to 50 characters), bio (up to 200), up to three links (HTTPS, optional label).
- ✅ Link to view your profile.

## Account (`/settings/account`)

- ✅ Email: shows the current one and a pending change; change it (confirm from both addresses).
- ✅ Password: set or change it.
- ✅ Sign-in methods: connect or disconnect Google and Apple; you can't remove your last way to sign in.
- ✅ Google Drive: connect or disconnect (your Drive files stay in Drive).
- ✅ Sign out.
- ✅ **Delete account:** confirm, cancel billing, remove uploaded files, and delete the account and associated records. Discord role removal is queued for synchronization.
- ✅ Download account data and project files as a ZIP.

## Subscription (`/settings/subscription`)

Works like Netflix: upgrades start now, downgrades at the next billing date, cancel anytime.

- ✅ Current plan, monthly or yearly, and when it renews or ends.
- ✅ Past-due payments: explains that Creem will retry, with a link to update the card.
- ✅ **Change plan:** pick any other plan.
  - Upgrades switch right away; the exact charge for the rest of the period is shown before confirming.
  - Downgrades are kept until renewal ("Your plan switches to Starter on …"), with "Keep Pro" to undo.
- ✅ **Billing (Creem portal):** update payment method, invoices and receipts, cancel plan.
- ✅ "Keep my plan" undoes a scheduled cancellation.
- ✅ Links to Pricing and the Refund Policy; opens with a plan already chosen when coming from Pricing.
- ✅ Cloud project usage and AI token usage, remaining allowance, and the monthly UTC reset date. Failed queries are shown as unavailable.
- ✅ Support contact with account context; Advanced subscribers get a priority subject line.

## Member perks (`/settings/perks`)

- ✅ Any account can show, hide, or remove received badges. Gifts are private until displayed.
- ✅ Paid members can gift their published artwork as a named custom badge, with a private message (up to five gifts per rolling day).
- ✅ Paid members can maintain hiring contact details, availability, and up to twelve portfolio links with optional published-art previews.
- ✅ Discord linking, role status, retry, and disconnect controls are implemented. External application/bot/role setup is still pending; see [Discord setup](../discord-setup.md).

## Privacy (`/settings/privacy`)

- ✅ Profile public or private. Private hides your profile and published arts from everyone else.
- ✅ Arts stay private until you publish them, whatever this setting.
- ❓ Hide the activity heatmap, or follower count, while staying public.

Member perks portfolio entries can be edited in place and reordered with Move up / Move down.
Permanent badge/project removal asks for confirmation; hiding a badge keeps the gift.
Badge messages are private to the recipient's settings view, including API access.
Subscription settings links directly to Member perks, and plans without AI show
“Not included” rather than an empty token meter.
