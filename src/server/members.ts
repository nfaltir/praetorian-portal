import "server-only";
import { and, asc, desc, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { setupToken, user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { isRole, type Role } from "@/lib/roles";
import type { CurrentUser } from "@/lib/session";
import { audit } from "./audit";

/*
  Staff member management rules (agreed):
  - Any staff member can add classmates and issue links for classmates.
  - Only the superuser can act on staff accounts (links, disable) or change roles.
  - Nobody can disable themselves or change their own role.
*/

export type MemberRow = {
  id: string;
  name: string;
  username: string;
  role: Role;
  activated: boolean;
  twoFactorEnabled: boolean;
  disabled: boolean;
  pendingLinkExpires: Date | null;
};

export async function listMembers(): Promise<MemberRow[]> {
  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      activatedAt: user.activatedAt,
      twoFactorEnabled: user.twoFactorEnabled,
      disabled: user.disabled,
    })
    .from(user)
    .orderBy(asc(user.name));

  const pending = await db
    .select({ userId: setupToken.userId, expiresAt: setupToken.expiresAt })
    .from(setupToken)
    .where(and(isNull(setupToken.usedAt), gt(setupToken.expiresAt, new Date())))
    .orderBy(desc(setupToken.expiresAt));
  const pendingBy = new Map<string, Date>();
  for (const p of pending) if (!pendingBy.has(p.userId)) pendingBy.set(p.userId, p.expiresAt);

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    username: r.username ?? "",
    role: isRole(r.role) ? r.role : "member",
    activated: Boolean(r.activatedAt),
    twoFactorEnabled: Boolean(r.twoFactorEnabled),
    disabled: r.disabled,
    pendingLinkExpires: pendingBy.get(r.id) ?? null,
  }));
}

export async function getTarget(id: string) {
  const row = await db.query.user.findFirst({
    columns: { id: true, role: true, disabled: true, activatedAt: true, name: true },
    where: eq(user.id, id),
  });
  if (!row) return null;
  return { ...row, role: isRole(row.role) ? row.role : ("member" as Role) };
}

export function mayManage(actor: CurrentUser, target: { id: string; role: Role }) {
  if (actor.role === "superuser") return true;
  return target.role === "member";
}

export async function setDisabled(actor: CurrentUser, targetId: string, disabled: boolean) {
  await db.update(user).set({ disabled }).where(eq(user.id, targetId));
  if (disabled) {
    const ctx = await auth.$context;
    await ctx.internalAdapter.deleteUserSessions(targetId);
  }
  await audit({ actorId: actor.id, action: disabled ? "member.disabled" : "member.enabled", targetUserId: targetId });
}

export async function setRole(actor: CurrentUser, targetId: string, from: Role, to: Role) {
  await db.update(user).set({ role: to }).where(eq(user.id, targetId));
  await audit({ actorId: actor.id, action: "member.role_changed", targetUserId: targetId, detail: { from, to } });
}
