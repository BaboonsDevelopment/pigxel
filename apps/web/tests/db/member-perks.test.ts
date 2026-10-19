import { describe, expect, it } from "vitest";
import { aTile, admin, guest, signUp } from "./helpers";
import { ARTIST_PLAN } from "../../src/features/billing/pricing";

async function membership(userId: string) {
  await admin
    .rpc("apply_creem_subscription", {
      p_id: `sub_test_${crypto.randomUUID()}`,
      p_user_id: userId,
      p_customer_id: `cust_${userId}`,
      p_status: "active",
      p_product_id: ARTIST_PLAN.productId.month,
      p_plan: "artist",
      p_current_period_ends_at: new Date(Date.now() + 86400000).toISOString(),
      p_cancels_at: null,
      p_event_at: new Date().toISOString(),
    })
    .throwOnError();
}

async function badgeFixture() {
  const sender = await signUp("sender");
  const recipient = await signUp("recipient");
  const { data: senderProfile } = await admin
    .from("profiles")
    .select("username")
    .eq("id", recipient.user.id)
    .single()
    .throwOnError();
  await membership(sender.user.id);
  const { data: art } = await sender.client
    .from("tiles")
    .insert(aTile())
    .select("id")
    .single()
    .throwOnError();
  await admin
    .from("tiles")
    .update({ visibility: "public", review: "approved" })
    .eq("id", art.id)
    .throwOnError();
  const args = {
    p_username: senderProfile.username,
    p_tile_id: art.id,
    p_label: "Pixel star",
    p_message: "Thanks!",
  };
  return { sender, recipient, args };
}

describe("member perks permissions", () => {
  it("gifts stay private until the recipient chooses to display them", async () => {
    const { sender, recipient, args } = await badgeFixture();
    await admin
      .from("profiles")
      .update({ visibility: "public" })
      .eq("id", recipient.user.id)
      .throwOnError();
    const { data: id } = await sender.client
      .rpc("gift_profile_badge", args)
      .throwOnError();
    expect(
      (await guest().from("profile_badges").select("id").eq("id", id)).data,
    ).toEqual([]);
    await recipient.client
      .from("profile_badges")
      .update({ visible: true })
      .eq("id", id)
      .throwOnError();
    expect(
      (await guest().from("profile_badges").select("id").eq("id", id)).data,
    ).toEqual([{ id }]);
    await recipient.client
      .from("profiles")
      .update({ visibility: "private" })
      .eq("id", recipient.user.id)
      .throwOnError();
    expect(
      (await guest().from("profile_badges").select("id").eq("id", id)).data,
    ).toEqual([]);
  });

  it("rejects self-gifts, private artwork, and gifting without an active paid plan", async () => {
    const { sender, args } = await badgeFixture();
    const { data: profile } = await admin
      .from("profiles")
      .select("username")
      .eq("id", sender.user.id)
      .single()
      .throwOnError();
    expect(
      (
        await sender.client.rpc("gift_profile_badge", {
          ...args,
          p_username: profile.username,
        })
      ).error,
    ).toBeTruthy();
    await sender.client
      .from("tiles")
      .update({ visibility: "private" })
      .eq("id", args.p_tile_id)
      .throwOnError();
    expect(
      (await sender.client.rpc("gift_profile_badge", args)).error,
    ).toBeTruthy();
    await admin
      .from("subscriptions")
      .update({ status: "canceled" })
      .eq("user_id", sender.user.id)
      .throwOnError();
    expect(
      (await sender.client.rpc("gift_profile_badge", args)).error,
    ).toMatchObject({ code: "42501" });
  });

  it("hides hiring portfolios when the profile is private or membership ends", async () => {
    const owner = await signUp("portfolio");
    const values = {
      headline: "Game artist",
      contact_url: "https://example.com/contact",
      description: "Pixel art",
      available: true,
    };
    expect(
      (await owner.client.from("hiring_profiles").insert(values)).error,
    ).toBeTruthy();
    await membership(owner.user.id);
    await owner.client.from("hiring_profiles").insert(values).throwOnError();
    await owner.client
      .from("profiles")
      .update({ visibility: "public" })
      .eq("id", owner.user.id)
      .throwOnError();
    expect(
      (
        await guest()
          .from("hiring_profiles")
          .select("headline")
          .eq("user_id", owner.user.id)
      ).data,
    ).toEqual([{ headline: "Game artist" }]);
    await admin
      .from("subscriptions")
      .update({ status: "canceled" })
      .eq("user_id", owner.user.id)
      .throwOnError();
    expect(
      (
        await guest()
          .from("hiring_profiles")
          .select("headline")
          .eq("user_id", owner.user.id)
      ).data,
    ).toEqual([]);
  });

  it("never lets members write a Discord identity directly", async () => {
    const member = await signUp("discord");
    expect(
      (
        await member.client
          .from("discord_connections")
          .insert({
            user_id: member.user.id,
            discord_user_id: "123456789012345678",
            username: "spoofed",
          })
      ).error,
    ).toBeTruthy();
  });

  it("enforces team-only status changes and sends one notification per actual change", async () => {
    const author = await signUp("feedback");
    const team = await signUp("team");
    const { data: report } = await author.client
      .from("feedback")
      .insert({
        kind: "bug",
        title: "A bug",
        description: "Something went wrong",
      })
      .select("id")
      .single()
      .throwOnError();
    expect(
      (
        await author.client.rpc("set_feedback_status", {
          p_id: report.id,
          p_status: "implemented",
        })
      ).error,
    ).toMatchObject({ code: "42501" });
    await admin.auth.admin.updateUserById(team.user.id, {
      app_metadata: { role: "admin" },
    });
    await team.client.auth.refreshSession();
    for (let i = 0; i < 2; i++)
      await team.client
        .rpc("set_feedback_status", {
          p_id: report.id,
          p_status: "implemented",
        })
        .throwOnError();
    const { data: history } = await author.client
      .from("feedback_status_history")
      .select("status")
      .eq("feedback_id", report.id)
      .throwOnError();
    expect(history).toEqual([{ status: "implemented" }]);
    const { data: notifications } = await author.client
      .from("notifications")
      .select("kind")
      .eq("feedback_id", report.id)
      .throwOnError();
    expect(notifications).toEqual([{ kind: "feedback_status" }]);
  });
});
