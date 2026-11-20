import { internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

declare const process: { env: Record<string, string | undefined> };
export const recordDelivery = internalMutation({
  args: { id: v.id("invitations"), sent: v.boolean() },
  handler: async (ctx, { id, sent }) =>
    ctx.db.patch(id, { mailStatus: sent ? "sent" : "failed" }),
});
// The inbox is authoritative; email only notifies the recipient. The URL
// contains no bearer credential and is never taken from a browser request.
export const notify = internalAction({
  args: { id: v.id("invitations"), email: v.string() },
  handler: async (ctx, { id, email }): Promise<void> => {
    const { RESEND_API_KEY, RIVERGUARD_INVITE_FROM, RIVERGUARD_APP_URL } =
      process.env;
    let sent = false;
    try {
      if (!RESEND_API_KEY || !RIVERGUARD_INVITE_FROM || !RIVERGUARD_APP_URL)
        throw new Error("Incomplete mail configuration");
      const url = new URL("/auth/invitation", RIVERGUARD_APP_URL);
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
          "Idempotency-Key": String(id),
        },
        body: JSON.stringify({
          from: RIVERGUARD_INVITE_FROM,
          to: [email],
          subject: "RiverGuard workspace invitation",
          text: `An administrator invited you to RiverGuard. Sign in or register with this email, then review your invitation at ${url}. It expires in seven days.`,
        }),
      });
      sent = response.ok;
    } finally {
      await ctx.runMutation(internal.invitationMail.recordDelivery, {
        id,
        sent,
      });
    }
  },
});
