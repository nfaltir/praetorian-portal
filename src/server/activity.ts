import "server-only";
import { and, desc, eq, like, lt, or, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { auditLog, user } from "@/db/schema";

/*
  Read-only view of the audit log for the superuser's Activity page.
  The audit log itself is append-only (database trigger); nothing here
  writes to it.

  Failed sign-ins in a row for the same account and IP within 15 minutes
  are grouped into one line ("5 failed sign-ins ...") so a burst stands out
  instead of flooding the feed. Nothing is hidden: each group keeps its count.
*/

export const ACTIVITY_FILTERS = {
  all: { label: "All", prefixes: [] as string[] },
  signins: { label: "Sign-ins", prefixes: ["auth."] },
  accounts: { label: "Accounts", prefixes: ["member.created", "member.role_changed", "member.disabled", "member.enabled", "link.", "superuser."] },
  money: { label: "Money", prefixes: ["ledger.", "member.target_changed"] },
  content: { label: "Content", prefixes: ["update.", "poll.", "rsvp.", "playlist."] },
  exports: { label: "Exports", prefixes: ["export."] },
} as const;

export type ActivityFilter = keyof typeof ACTIVITY_FILTERS;
export const isActivityFilter = (f: string): f is ActivityFilter => Object.hasOwn(ACTIVITY_FILTERS, f);

export type ActivityItem = {
  id: string;
  at: string;
  action: string;
  actorName: string | null;
  targetName: string | null;
  detail: Record<string, unknown> | null;
  count: number; // > 1 only for grouped failed sign-ins
  firstAt: string; // earliest time in a group
};

const PAGE = 100;
const GROUP_WINDOW_MS = 15 * 60_000;

/* Cursor: "<ISO time>_<id>" of the last item shown */
export function parseCursor(raw: string | undefined) {
  if (!raw) return null;
  const i = raw.lastIndexOf("_");
  const at = new Date(raw.slice(0, i));
  const id = raw.slice(i + 1);
  return i > 0 && !Number.isNaN(at.getTime()) && /^[\w-]{1,64}$/.test(id) ? { at, id } : null;
}

export async function listActivity(filter: ActivityFilter, cursor: { at: Date; id: string } | null) {
  const actor = alias(user, "actor");
  const target = alias(user, "target");

  const conds: SQL[] = [];
  const prefixes = ACTIVITY_FILTERS[filter].prefixes;
  if (prefixes.length) {
    conds.push(or(...prefixes.map((p) => (p.endsWith(".") ? like(auditLog.action, `${p}%`) : eq(auditLog.action, p))))!);
  }
  if (cursor) {
    conds.push(or(lt(auditLog.at, cursor.at), and(eq(auditLog.at, cursor.at), lt(auditLog.id, cursor.id)))!);
  }

  const rows = await db
    .select({
      id: auditLog.id,
      at: auditLog.at,
      action: auditLog.action,
      detail: auditLog.detail,
      actorName: actor.name,
      targetName: target.name,
    })
    .from(auditLog)
    .leftJoin(actor, eq(actor.id, auditLog.actorId))
    .leftJoin(target, eq(target.id, auditLog.targetUserId))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(auditLog.at), desc(auditLog.id))
    .limit(PAGE + 1);

  const hasMore = rows.length > PAGE;
  const page = rows.slice(0, PAGE);
  const last = page.at(-1);

  // Group consecutive failed sign-ins (same username or unknown, same IP, within the window)
  const items: ActivityItem[] = [];
  for (const r of page) {
    const at = r.at.toISOString();
    const prev = items.at(-1);
    const d = r.detail ?? {};
    if (
      r.action === "auth.sign_in_failed" &&
      prev?.action === "auth.sign_in_failed" &&
      prev.detail?.username === d.username &&
      prev.detail?.ip === d.ip &&
      new Date(prev.firstAt).getTime() - r.at.getTime() <= GROUP_WINDOW_MS
    ) {
      prev.count += 1;
      prev.firstAt = at;
      continue;
    }
    items.push({
      id: r.id,
      at,
      action: r.action,
      actorName: r.actorName,
      targetName: r.targetName,
      detail: r.detail,
      count: 1,
      firstAt: at,
    });
  }

  return { items, nextCursor: hasMore && last ? `${last.at.toISOString()}_${last.id}` : null };
}
