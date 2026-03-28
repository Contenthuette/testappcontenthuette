"use node";

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

function getStripeKey(): string {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY environment variable is required");
  return key;
}

async function stripeRequest(
  endpoint: string,
  body: Record<string, string>,
): Promise<Record<string, unknown>> {
  const key = getStripeKey();
  const params = new URLSearchParams(body);
  const res = await fetch(`https://api.stripe.com/v1${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Stripe API error (${res.status}): ${text}`);
  }
  return (await res.json()) as Record<string, unknown>;
}

async function stripeGet(
  endpoint: string,
): Promise<Record<string, unknown>> {
  const key = getStripeKey();
  const res = await fetch(`https://api.stripe.com/v1${endpoint}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Stripe API error (${res.status}): ${text}`);
  }
  return (await res.json()) as Record<string, unknown>;
}

// Public action: create a Stripe Checkout Session for a subscription
export const createCheckoutSession = action({
  args: {
    plan: v.union(v.literal("monthly"), v.literal("yearly")),
    sessionToken: v.string(),
    siteUrl: v.string(),
  },
  returns: v.object({ url: v.string() }),
  handler: async (ctx, args) => {
    const isYearly = args.plan === "yearly";
    const priceAmount = isYearly ? 3999 : 499; // cents
    const interval = isYearly ? "year" : "month";
    const planName = isYearly ? "Z Jährlich" : "Z Monatlich";

    const successUrl = `${args.siteUrl}/stripe/success?session_id={CHECKOUT_SESSION_ID}&token=${encodeURIComponent(args.sessionToken)}`;
    const cancelUrl = `${args.siteUrl}/stripe/cancel`;

    const session = await stripeRequest("/checkout/sessions", {
      mode: "subscription",
      "payment_method_types[0]": "card",
      "line_items[0][price_data][currency]": "eur",
      "line_items[0][price_data][product_data][name]": planName,
      "line_items[0][price_data][product_data][description]": "Z Social Media Abo für MV",
      "line_items[0][price_data][recurring][interval]": interval,
      "line_items[0][price_data][unit_amount]": String(priceAmount),
      "line_items[0][quantity]": "1",
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: args.sessionToken,
      allow_promotion_codes: "true",
    });

    const checkoutUrl = session.url as string | undefined;
    if (!checkoutUrl) throw new Error("Stripe did not return a checkout URL");

    // Store the pending subscription record
    await ctx.runMutation(internal.stripeHelpers.create, {
      sessionToken: args.sessionToken,
      plan: args.plan,
      stripeSessionId: session.id as string,
    });

    return { url: checkoutUrl };
  },
});

// Internal action: verify a Stripe Checkout Session and update pending subscription
export const verifyCheckoutSession = internalAction({
  args: { stripeSessionId: v.string() },
  returns: v.union(v.literal("success"), v.literal("failed"), v.literal("not_found")),
  handler: async (ctx, args) => {
    try {
      const session = await stripeGet(`/checkout/sessions/${args.stripeSessionId}`);

      const paymentStatus = session.payment_status as string;
      const status = session.status as string;

      if (paymentStatus === "paid" && status === "complete") {
        const customerId = typeof session.customer === "string"
          ? session.customer
          : (session.customer as Record<string, string> | null)?.id ?? "";
        const subscriptionId = typeof session.subscription === "string"
          ? session.subscription
          : (session.subscription as Record<string, string> | null)?.id ?? "";

        await ctx.runMutation(internal.stripeHelpers.markCompleted, {
          stripeSessionId: args.stripeSessionId,
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
        });
        return "success";
      } else {
        await ctx.runMutation(internal.stripeHelpers.markFailed, {
          stripeSessionId: args.stripeSessionId,
        });
        return "failed";
      }
    } catch (e) {
      console.error("Stripe verification failed:", e);
      return "not_found";
    }
  },
});

// Public action: create a Stripe Billing Portal session for subscription management
export const createBillingPortalSession = action({
  args: {
    returnUrl: v.string(),
  },
  returns: v.object({ url: v.string() }),
  handler: async (ctx, args) => {
    // Get authenticated user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Authentication required");
    const authId = identity.subject.split("|")[0]?.trim();
    if (!authId) throw new Error("Invalid auth token");

    // Get user from DB
    const user: Record<string, unknown> | null = await ctx.runQuery(
      internal.stripeHelpers.getUserForPortal,
      { authId },
    );
    if (!user) throw new Error("User not found");

    let customerId = user.stripeCustomerId as string | undefined;

    // If no stripeCustomerId stored, look up by email in Stripe
    if (!customerId) {
      const email = user.email as string;
      if (!email) throw new Error("No email on user account");

      const key = getStripeKey();
      const searchRes = await fetch(
        `https://api.stripe.com/v1/customers?email=${encodeURIComponent(email)}&limit=1`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${key}` },
        },
      );
      if (!searchRes.ok) {
        throw new Error(`Stripe customer search failed: ${await searchRes.text()}`);
      }
      const searchData = (await searchRes.json()) as { data: Array<{ id: string }> };
      if (searchData.data.length > 0) {
        customerId = searchData.data[0].id;
        // Save it for next time
        await ctx.runMutation(internal.stripeHelpers.saveStripeCustomerId, {
          authId,
          stripeCustomerId: customerId,
        });
      }
    }

    if (!customerId) {
      throw new Error("Kein Stripe-Konto gefunden. Bitte kontaktiere den Support.");
    }

    const session = await stripeRequest("/billing_portal/sessions", {
      customer: customerId,
      return_url: args.returnUrl,
    });

    const portalUrl = session.url as string | undefined;
    if (!portalUrl) throw new Error("Stripe did not return a portal URL");

    return { url: portalUrl };
  },
});

// Internal action: handle Stripe webhook events
export const handleWebhookEvent = internalAction({
  args: {
    eventType: v.string(),
    customerId: v.optional(v.string()),
    subscriptionId: v.optional(v.string()),
    subscriptionStatus: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { eventType, customerId, subscriptionId, subscriptionStatus } = args;

    if (!customerId) {
      console.warn("Webhook event missing customerId:", eventType);
      return null;
    }

    switch (eventType) {
      case "customer.subscription.deleted":
        await ctx.runMutation(internal.stripeHelpers.updateSubscriptionByCustomer, {
          stripeCustomerId: customerId,
          status: "canceled",
        });
        break;

      case "customer.subscription.updated":
        if (subscriptionStatus === "active") {
          // Renewal or reactivation
          await ctx.runMutation(internal.stripeHelpers.updateSubscriptionByCustomer, {
            stripeCustomerId: customerId,
            status: "active",
          });
        } else if (
          subscriptionStatus === "past_due" ||
          subscriptionStatus === "unpaid"
        ) {
          await ctx.runMutation(internal.stripeHelpers.updateSubscriptionByCustomer, {
            stripeCustomerId: customerId,
            status: "expired",
          });
        } else if (subscriptionStatus === "canceled") {
          await ctx.runMutation(internal.stripeHelpers.updateSubscriptionByCustomer, {
            stripeCustomerId: customerId,
            status: "canceled",
          });
        }
        break;

      case "invoice.payment_failed":
        console.warn("Payment failed for customer:", customerId);
        await ctx.runMutation(internal.stripeHelpers.updateSubscriptionByCustomer, {
          stripeCustomerId: customerId,
          status: "expired",
        });
        break;

      default:
        console.log("Unhandled webhook event:", eventType);
    }

    return null;
  },
});
