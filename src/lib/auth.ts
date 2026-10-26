import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware, getSessionFromCtx } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { twoFactor, username } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { site } from "@/config/site";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { env } from "./env";
import { can, isRole } from "./roles";
import { audit } from "@/server/audit";
import { clearLimit, hitLimit, LIMITS, peekLimit } from "@/server/rate-limit";

/*
  Better Auth configuration.

  - Username + password only. Public sign-up is off; staff create accounts.
  - Every account still has an email column (Better Auth requires one). We
    store a placeholder under the reserved .invalid domain that can never
    receive mail. It is never shown.
  - Role, target and disabled flag are server-only fields (input: false), so
    no request from a browser can set them.
  - Endpoints we don't use are switched off so they can't be abused.
*/

/* Same header order as advanced.ipAddress below: Vercel's edge sets the first one */
function ipFrom(headers: Headers | undefined) {
  const raw = headers?.get("x-vercel-forwarded-for") ?? headers?.get("x-forwarded-for") ?? "";
  return raw.split(",")[0]?.trim() || "unknown";
}

/* Matches what the login form sends (trimmed, lowercased) */
const normalizeUsername = (v: unknown) => String(v ?? "").trim().toLowerCase().slice(0, 30);

export const PLACEHOLDER_EMAIL_DOMAIN = "users.praetorianz.invalid";

export const auth = betterAuth({
  appName: `${site.className} Reunion`,
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  telemetry: { enabled: false },

  database: drizzleAdapter(db, { provider: "pg", schema }),

  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
    autoSignIn: false,
  },

  user: {
    additionalFields: {
      role: { type: "string", required: true, defaultValue: "member", input: false },
      targetCents: { type: "number", required: true, defaultValue: site.defaultTargetCents, input: false },
      disabled: { type: "boolean", required: true, defaultValue: false, input: false },
      activatedAt: { type: "date", required: false, input: false },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 14, // 14 days
    updateAge: 60 * 60 * 24, // extend at most once a day
  },

  rateLimit: {
    enabled: true,
    storage: "database", // shared across serverless instances
    window: 60,
    max: 60,
    customRules: {
      "/sign-in/username": { window: 300, max: 20 }, // per IP; leaves room for a group on shared wifi
      "/two-factor/verify-totp": { window: 300, max: 10 },
      "/two-factor/verify-backup-code": { window: 300, max: 5 },
      "/two-factor/enable": { window: 300, max: 5 },
      "/change-password": { window: 300, max: 5 },
    },
  },

  advanced: {
    cookiePrefix: "portal",
    useSecureCookies: process.env.NODE_ENV === "production",
    ipAddress: {
      // Set by Vercel's edge, which overwrites any client-supplied value
      ipAddressHeaders: ["x-vercel-forwarded-for", "x-forwarded-for"],
    },
  },

  databaseHooks: {
    session: {
      create: {
        // Disabled accounts can't start a session, even with the right password
        before: async (session) => {
          const row = await db.query.user.findFirst({
            columns: { disabled: true },
            where: eq(schema.user.id, session.userId),
          });
          if (!row || row.disabled) return false;
        },
        // A session is only created after the password (and 2FA, if on) succeeded
        after: async (session) => {
          const row = await db.query.user.findFirst({
            columns: { username: true },
            where: eq(schema.user.id, session.userId),
          });
          if (row?.username) await clearLimit("signInFail", row.username);
          await audit({
            actorId: session.userId,
            action: "auth.signed_in",
            targetUserId: session.userId,
            detail: { ip: session.ipAddress ?? "unknown", device: (session.userAgent ?? "").slice(0, 200) },
          });
        },
      },
    },
  },

  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      // Per-account limit: refuse before the password is even checked
      if (ctx.path === "/sign-in/username") {
        const name = normalizeUsername(ctx.body?.username);
        if (name && (await peekLimit("signInFail", name)).count >= LIMITS.signInFail.max) {
          throw new APIError("TOO_MANY_REQUESTS", { message: "Too many failed attempts for this account. Try again later." });
        }
        return;
      }
      // 2FA is mandatory for staff: refuse to switch it off, even via a direct API call
      if (ctx.path !== "/two-factor/disable") return;
      const session = await getSessionFromCtx(ctx);
      const role = session?.user.role;
      if (isRole(role) && can.requiresTwoFactor(role)) {
        throw new APIError("FORBIDDEN", { message: "Two-step verification is required for organizer accounts." });
      }
    }),

    /*
      Failed sign-ins: counted per account and audit-logged.
      The typed username is recorded ONLY if it belongs to a real account:
      people often type their password into the username box by mistake,
      and that must never end up in the log. Unknown names also don't get
      a counter row, so a bot can't fill the table with junk keys.
    */
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-in/username") return;
      if (!(ctx.context.returned instanceof APIError)) return;
      const name = normalizeUsername(ctx.body?.username);
      const account = name
        ? await db.query.user.findFirst({ columns: { id: true }, where: eq(schema.user.username, name) })
        : undefined;
      if (account) await hitLimit("signInFail", name);
      await audit({
        actorId: null,
        action: "auth.sign_in_failed",
        targetUserId: account?.id ?? null,
        detail: {
          username: account ? name : null,
          ip: ipFrom(ctx.headers),
          device: (ctx.headers?.get("user-agent") ?? "").slice(0, 200),
        },
      });
    }),
  },

  disabledPaths: [
    "/sign-up/email",
    "/sign-in/email",
    "/sign-in/social",
    "/is-username-available",
    "/update-user",
    "/change-email",
    "/delete-user",
    "/request-password-reset",
    "/reset-password",
    "/forget-password",
    "/send-verification-email",
    "/verify-email",
    "/link-social",
    "/unlink-account",
    "/two-factor/send-otp",
    "/two-factor/verify-otp",
  ],

  plugins: [
    username({ minUsernameLength: 3, maxUsernameLength: 30 }),
    twoFactor({ issuer: `${site.className} Reunion` }),
    nextCookies(), // must stay last
  ],
});

export type Session = typeof auth.$Infer.Session;
