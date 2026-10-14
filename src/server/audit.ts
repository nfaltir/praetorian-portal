import { randomUUID } from "node:crypto";
import { db } from "@/db";
import { auditLog } from "@/db/schema";

export type AuditAction =
  | "member.created"
  | "member.role_changed"
  | "member.disabled"
  | "member.enabled"
  | "link.setup_issued"
  | "link.reset_issued"
  | "link.redeemed"
  | "superuser.created";

/* Never put passwords, tokens or secrets in `detail`. */
export async function audit(entry: {
  actorId: string | null;
  action: AuditAction;
  targetUserId?: string | null;
  detail?: Record<string, unknown>;
}) {
  await db.insert(auditLog).values({
    id: randomUUID(),
    actorId: entry.actorId,
    action: entry.action,
    targetUserId: entry.targetUserId ?? null,
    detail: entry.detail ?? null,
  });
}
