# Discord member role setup

The integration is implemented, but remains unavailable until the application,
bot, and role are configured. A channel alone does not provide these settings.

1. Create a Pigxel application in the [Discord Developer Portal](https://discord.com/developers/applications).
2. In OAuth2, register the app's callback: `${APP_URL}/auth/discord/callback`.
   Register the local and production URLs separately when using both.
3. Create the application's bot and invite it to your server using Discord's
   OAuth2 URL Generator, with the `bot` scope and **Manage Roles** permission.
4. Create a **Pigxel Premium** role in the server. Place the bot's role above it.
5. Enable Discord Developer Mode to copy the **server ID** and premium **role ID**.
   These are not the channel ID.
6. Set these server environment variables, locally and on the production host:

   ```dotenv
   DISCORD_CLIENT_ID=
   DISCORD_CLIENT_SECRET=
   DISCORD_BOT_TOKEN=
   DISCORD_GUILD_ID=
   DISCORD_PREMIUM_ROLE_ID=
   DISCORD_INVITE_URL=
   ```

   `DISCORD_INVITE_URL` is optional. Store secrets outside Git and do not paste
   them into chat. Use a separate test server/role when configuring local tests.

7. Apply `20261019150000_discord_connections.sql`. The role synchronization job
   reuses `pigxel_app_url` and `pigxel_cron_secret` in Supabase Vault and the app's
   `CRON_SECRET`, as described in the README.
8. In Settings → Member perks, join the server and connect Discord. Test adding
   a paid plan, cancellation at the end of its term, disconnection, and account
   deletion. Remove the pricing “Soon” label only after this succeeds.

Linking requests only Discord identity access. OAuth tokens are discarded and
revoked after the identity check; they are not stored. The bot can add/remove
only the configured role through this integration. Subscription events attempt
to synchronize it immediately; the scheduled worker retries failures and
cleans up role removals left by deleted accounts.

The implementation follows Discord's [OAuth2 flow](https://docs.discord.com/developers/topics/oauth2)
and [guild role API](https://docs.discord.com/developers/resources/guild#add-guild-member-role).
