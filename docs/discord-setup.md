# Discord plan roles setup

The integration is implemented, but remains unavailable until the application,
bot, and role are configured. A channel alone does not provide these settings.

1. Create a Pigxel application in the [Discord Developer Portal](https://discord.com/developers/applications).
2. In OAuth2, register the app's callback: `${APP_URL}/auth/discord/callback`.
   Register the local and production URLs separately when using both.
3. Create the application's bot and invite it to your server using Discord's
   OAuth2 URL Generator, with the `bot` scope and **Manage Roles** permission.
4. Create the **Artist**, **Pro** and **Creator** roles in the server. Place the
   bot's role above Artist and Pro. People get one role each:
   - **Pro**: any AI plan (Starter, Pro or Advanced).
   - **Artist**: the Artist plan, when there's no AI plan.
   - **Creator**: given by hand. The bot never adds or removes it; members who
     have it get no Artist or Pro role, even with a subscription.
5. Enable Discord Developer Mode to copy the **server ID** and each **role ID**.
   These are not the channel ID.
6. Set these server environment variables, locally and on the production host:

   ```dotenv
   DISCORD_CLIENT_ID=
   DISCORD_CLIENT_SECRET=
   DISCORD_BOT_TOKEN=
   DISCORD_GUILD_ID=
   DISCORD_ARTIST_ROLE_ID=
   DISCORD_PRO_ROLE_ID=
   DISCORD_CREATOR_ROLE_ID=
   DISCORD_INVITE_URL=
   ```

   `DISCORD_CREATOR_ROLE_ID` and `DISCORD_INVITE_URL` are optional. Store secrets outside Git and do not paste
   them into chat. Use a separate test server/role when configuring local tests.

7. Apply `20261019150000_discord_connections.sql` and
   `20261020120000_discord_plan_roles.sql`. The role synchronization job
   reuses `pigxel_app_url` and `pigxel_cron_secret` in Supabase Vault and the app's
   `CRON_SECRET`, as described in the README.
8. In Settings → Member perks, join the server and connect Discord. Test adding
   a paid plan, cancellation at the end of its term, disconnection, and account
   deletion. Remove the pricing “Soon” label only after this succeeds.

Linking requests only Discord identity access. OAuth tokens are discarded and
revoked after the identity check; they are not stored. The bot adds/removes
only the Artist and Pro roles, and only reads the Creator role. Subscription events attempt
to synchronize it immediately; the scheduled worker retries failures and
cleans up role removals left by deleted accounts.

The implementation follows Discord's [OAuth2 flow](https://docs.discord.com/developers/topics/oauth2)
and [guild role API](https://docs.discord.com/developers/resources/guild#add-guild-member-role).
