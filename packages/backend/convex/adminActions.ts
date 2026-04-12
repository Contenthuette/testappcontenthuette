"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

/* ─── Helper: Stripe API DELETE ──────────────────────────────── */
function getStripeKey(): string {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY environment variable is required");
  return key;
}

async function stripeCancelSubscription(subscriptionId: string): Promise<void> {
  const key = getStripeKey();
  const res = await fetch(
    `https://api.stripe.com/v1/subscriptions/${subscriptionId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${key}` },
    },
  );
  if (!res.ok) {
    const text = await res.text();
    // If already canceled or not found, don't throw
    if (res.status === 404) {
      console.warn("Stripe subscription not found (already deleted?):", subscriptionId);
      return;
    }
    throw new Error(`Stripe cancel error (${res.status}): ${text}`);
  }
}

/* ─── Helper: Send email via Resend ──────────────────────────── */
async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY not set – skipping email to", opts.to);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Z Social <leif@z-social.com>",
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error("Resend email failed:", res.status, text);
  }
}

/* ─── Action: Process user deletion side-effects ─────────────── */
export const processUserDeletion = internalAction({
  args: {
    email: v.string(),
    name: v.string(),
    stripeSubscriptionId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (_ctx, args) => {
    // 1. Cancel Stripe subscription if exists
    if (args.stripeSubscriptionId) {
      try {
        await stripeCancelSubscription(args.stripeSubscriptionId);
        console.log("Stripe subscription canceled:", args.stripeSubscriptionId);
      } catch (e) {
        console.error("Failed to cancel Stripe subscription:", e);
      }
    }

    // 2. Send notification email
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <span style="font-size: 48px; font-weight: 900; letter-spacing: -2px;">Z</span>
        </div>
        <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 16px; color: #000;">Dein Profil wurde gelöscht</h2>
        <p style="font-size: 15px; color: #333; line-height: 1.6; margin-bottom: 16px;">
          Hallo ${args.name},
        </p>
        <p style="font-size: 15px; color: #333; line-height: 1.6; margin-bottom: 16px;">
          wir möchten dich darüber informieren, dass dein Profil auf der Z-Plattform aufgrund eines <strong>Verstoßes gegen unsere Community-Richtlinien</strong> gelöscht wurde.
        </p>
        <p style="font-size: 15px; color: #333; line-height: 1.6; margin-bottom: 16px;">
          Dein Abo wurde automatisch gekündigt und es werden keine weiteren Zahlungen abgebucht.
        </p>
        <p style="font-size: 15px; color: #333; line-height: 1.6; margin-bottom: 16px;">
          Falls du Fragen hast, kannst du dich jederzeit an uns wenden unter <a href="mailto:leif@z-social.com" style="color: #000; font-weight: 600;">leif@z-social.com</a>.
        </p>
        <div style="border-top: 1px solid #eee; margin-top: 32px; padding-top: 16px;">
          <p style="font-size: 12px; color: #999;">Z Social · Mecklenburg-Vorpommern</p>
        </div>
      </div>
    `;

    await sendEmail({
      to: args.email,
      subject: "Dein Z-Profil wurde gelöscht",
      html,
    });

    return null;
  },
});
