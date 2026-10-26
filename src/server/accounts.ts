import { createHash, randomBytes, randomUUID } from "node:crypto";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { setupToken, user } from "@/db/schema";
import { auth, PLACEHOLDER_EMAIL_DOMAIN } from "@/lib/auth";
import type { Role } from "@/lib/roles";
import { audit } from "./audit";
import { clearLimit } from "./rate-limit";

/*
  Account lifecycle that Better Auth's public API doesn't cover, because
  public sign-up and email-based reset are switched off:
    createMember -> issueLink -> redeemLink

  It uses Better Auth's own password hasher and internal adapter
  (auth.$context), so hashes and account rows are exactly what Better
  Auth's login expects. better-auth is pinned to an exact version; re-run tests/e2e_auth.py
  after any upgrade.
*/

export const LINK_TTL_HOURS = 72;
export const PASSWORD_MIN = 12;
export const PASSWORD_MAX = 128;

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_.]{3,30}$/, "3 to 30 characters: letters, numbers, dots or underscores");

export const nameSchema = z.string().trim().min(2, "Enter a name").max(80);

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters`)
  .max(PASSWORD_MAX, `Use at most ${PASSWORD_MAX} characters`);

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export class AccountError extends Error {}

/* Creates a member with an unusable random password. They set a real one via a setup link. */
export async function createMember(input: {
  name: string;
  username: string;
  role: Role;
  actorId: string | null;
}) {
  const name = nameSchema.parse(input.name);
  const username = usernameSchema.parse(input.username);

  const taken = await db.query.user.findFirst({ columns: { id: true }, where: eq(user.username, username) });
  if (taken) throw new AccountError("That username is already taken.");

  const ctx = await auth.$context;
  const id = randomUUID();
  const unusable = await ctx.password.hash(randomBytes(48).toString("base64url"));

  await ctx.internalAdapter.createUser({
    id,
    name,
    email: `${id}@${PLACEHOLDER_EMAIL_DOMAIN}`,
    emailVerified: false,
    username,
    displayUsername: username,
    role: input.role,
  }, { method: "admin" });
  await ctx.internalAdapter.linkAccount({
    userId: id,
    providerId: "credential",
    accountId: id,
    password: unusable,
  });

  await audit({
    actorId: input.actorId,
    action: input.actorId ? "member.created" : "superuser.created",
    targetUserId: id,
    detail: { username, role: input.role },
  });

  return { id, username };
}

/*
  Returns the raw token exactly once. Only its hash is stored.
  Issuing a new link invalidates any older unused link for the same person.
*/
export async function issueLink(input: { userId: string; purpose: "setup" | "reset"; actorId: string | null }) {
  const token = randomBytes(32).toString("base64url");
  const now = new Date();

  await db
    .update(setupToken)
    .set({ usedAt: now })
    .where(and(eq(setupToken.userId, input.userId), isNull(setupToken.usedAt)));

  await db.insert(setupToken).values({
    id: randomUUID(),
    tokenHash: hashToken(token),
    userId: input.userId,
    purpose: input.purpose,
    createdBy: input.actorId,
    expiresAt: new Date(now.getTime() + LINK_TTL_HOURS * 3_600_000),
  });

  await audit({
    actorId: input.actorId,
    action: input.purpose === "setup" ? "link.setup_issued" : "link.reset_issued",
    targetUserId: input.userId,
  });

  return token;
}

/* Read-only check used to greet the person on the setup page. */
export async function inspectLink(token: string) {
  if (!token || token.length > 100) return null;
  const row = await db
    .select({ name: user.name, username: user.username, purpose: setupToken.purpose, disabled: user.disabled })
    .from(setupToken)
    .innerJoin(user, eq(user.id, setupToken.userId))
    .where(
      and(eq(setupToken.tokenHash, hashToken(token)), isNull(setupToken.usedAt), gt(setupToken.expiresAt, new Date())),
    )
    .limit(1);
  const found = row[0];
  if (!found || found.disabled) return null;
  return found;
}

/*
  Sets the password and burns the link.
  The claim is a single UPDATE ... WHERE used_at IS NULL, so two
  simultaneous submissions can't both succeed.
*/
export async function redeemLink(token: string, password: string) {
  const pw = passwordSchema.parse(password);
  if (!token || token.length > 100) throw new AccountError("This link is invalid or has expired.");

  const claimed = await db
    .update(setupToken)
    .set({ usedAt: new Date() })
    .where(
      and(eq(setupToken.tokenHash, hashToken(token)), isNull(setupToken.usedAt), gt(setupToken.expiresAt, new Date())),
    )
    .returning({ userId: setupToken.userId, purpose: setupToken.purpose });

  const link = claimed[0];
  if (!link) throw new AccountError("This link is invalid or has expired.");

  const target = await db.query.user.findFirst({
    columns: { id: true, username: true, disabled: true, activatedAt: true },
    where: eq(user.id, link.userId),
  });
  if (!target || target.disabled) throw new AccountError("This account is disabled. Contact an organizer.");

  const ctx = await auth.$context;
  await ctx.internalAdapter.updatePassword(target.id, await ctx.password.hash(pw));
  // A new password ends every existing session for this account
  await ctx.internalAdapter.deleteUserSessions(target.id);
  // An organizer-issued link also lifts any failed-sign-in block, so they can sign in right away
  if (target.username) await clearLimit("signInFail", target.username);

  if (!target.activatedAt) {
    await db.update(user).set({ activatedAt: sql`now()` }).where(eq(user.id, target.id));
  }

  await audit({ actorId: target.id, action: "link.redeemed", targetUserId: target.id, detail: { purpose: link.purpose } });
}
