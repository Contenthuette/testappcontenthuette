import { AuthFunctions, createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex, crossDomain } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth";
import { expo } from "@better-auth/expo";
import { components, internal } from "./_generated/api";
import { DataModel } from "./_generated/dataModel";
import { anonymous } from "better-auth/plugins";
import authConfig from "./auth.config";

const authFunctions: AuthFunctions = internal.auth;

function isAdminEmail(email: string): boolean {
    const normalizedEmail = email.toLowerCase();
    return normalizedEmail === "live@z-social.com" || normalizedEmail === "leif@z-social.com";
}

function isAllowedPreviewOrigin(origin: string): boolean {
    return /^https:\/\/[a-z0-9-]+\.preview\.bl\.run$/i.test(origin);
}

// The component client has methods needed for integrating Convex with Better Auth,
// as well as helper methods for general use.
export const authComponent = createClient<DataModel>(components.betterAuth, {
    authFunctions,
    triggers: {
        user: {
            onCreate: async (ctx, doc) => {
                const existingUser = await ctx.db
                    .query("users")
                    .withIndex("by_authId", (q) => q.eq("authId", doc._id))
                    .unique();
                if (existingUser) {
                    return;
                }

                await ctx.db.insert("users", {
                    authId: doc._id,
                    email: doc.email,
                    name: doc.name,
                    role: isAdminEmail(doc.email) ? "admin" : "user",
                    onboardingComplete: false,
                    subscriptionStatus: "none",
                    createdAt: typeof doc.createdAt === "number" ? doc.createdAt : new Date(doc.createdAt).getTime(),
                });
            },
            onUpdate: async (ctx, newDoc) => {
                const existingUser = await ctx.db
                    .query("users")
                    .withIndex("by_authId", (q) => q.eq("authId", newDoc._id))
                    .unique();
                if (!existingUser) {
                    return;
                }

                await ctx.db.patch(existingUser._id, {
                    email: newDoc.email,
                    name: newDoc.name,
                    role: isAdminEmail(newDoc.email) ? "admin" : existingUser.role,
                });
            },
        },
    },
});

// export the trigger API functions so that triggers work
export const { onCreate, onUpdate, onDelete } = authComponent.triggersApi();

const siteUrl = process.env.SITE_URL!;
const defaultTrustedOrigins = [
    siteUrl,
    "myapp://",
    "exp://",
    "http://localhost:*",
    "http://127.0.0.1:*",
];

async function trustedOrigins(request?: Request): Promise<string[]> {
    const requestOrigin = request?.headers.get("origin");
    if (requestOrigin && isAllowedPreviewOrigin(requestOrigin)) {
        return [...defaultTrustedOrigins, requestOrigin];
    }
    return [...defaultTrustedOrigins, "https://*.preview.bl.run"];
}

export const createAuth = (
    ctx: GenericCtx<DataModel>,
    { optionsOnly } = { optionsOnly: false }
) => {
    return betterAuth({
        socialProviders: {
            google: {
                clientId: process.env.GOOGLE_CLIENT_ID as string,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
            },
        },
        // disable logging when createAuth is called just to generate options.
        // this is not required, but there's a lot of noise in logs without it.
        logger: {
            disabled: optionsOnly,
        },
        trustedOrigins,
        database: authComponent.adapter(ctx),
        // Configure simple, non-verified email/password to get started
        emailAndPassword: {
            enabled: true,
            requireEmailVerification: false,
        },
        plugins: [
            // The Expo and Convex plugins are required
            anonymous(),
            expo(),
            convex({ authConfig }),
            crossDomain({ siteUrl }),
        ],
    });
};
