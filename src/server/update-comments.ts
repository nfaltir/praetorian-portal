import "server-only";
import { randomUUID } from "node:crypto";
import { and, asc, count, eq, gt, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { announcement, auditLog, updateComment, user } from "@/db/schema";
import { can } from "@/lib/roles";
import type { CurrentUser } from "@/lib/session";

/*
  Comments under updates. The only code that writes the update_comment table.
  - Any signed-in classmate may comment; authors may edit or delete their own.
  - Organizers may remove any comment: the text is cleared from the table
    and kept in the audit log (with who removed it), and a placeholder stays
    in the thread so moderation is visible.
  - Plain text only. Rendered as text, never HTML, and links are not made
    clickable, so nobody can plant a phishing link under someone's name.
  - Flood limit: 30 comments per person per hour, on top of the general
    per-minute write limit applied in the actions.
*/

export class CommentError extends Error {}

export type CommentView = {
  id: string;
  authorId: string;
  authorName: string;
  body: string; // "" when removed
  createdAt: string;
  editedAt: string | null;
  removed: boolean;
};

const MAX_PER_HOUR = 30;

function clean(s: string) {
  return s
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const bodySchema = z
  .string()
  .transform(clean)
  .pipe(z.string().min(1, "Write something first").max(1000, "Keep comments under 1,000 characters"));

function check(raw: string) {
  const r = bodySchema.safeParse(raw);
  if (!r.success) throw new CommentError(r.error.issues[0]?.message ?? "Check your comment and try again.");
  return r.data;
}

async function liveComment(id: string) {
  const row = await db.query.updateComment.findFirst({ where: eq(updateComment.id, id) });
  if (!row) throw new CommentError("That comment no longer exists.");
  if (row.removedAt) throw new CommentError("That comment was removed by an organizer.");
  return row;
}

export async function postComment(actor: CurrentUser, updateId: string, raw: string) {
  const body = check(raw);

  const exists = await db.query.announcement.findFirst({ columns: { id: true }, where: eq(announcement.id, updateId) });
  if (!exists) throw new CommentError("That update no longer exists.");

  const [{ n }] = await db
    .select({ n: count() })
    .from(updateComment)
    .where(and(eq(updateComment.authorId, actor.id), gt(updateComment.createdAt, new Date(Date.now() - 3_600_000))));
  if (n >= MAX_PER_HOUR) throw new CommentError("You've posted a lot of comments this hour. Please wait a bit and try again.");

  await db.insert(updateComment).values({ id: randomUUID(), updateId, authorId: actor.id, body });
}

export async function editComment(actor: CurrentUser, id: string, raw: string) {
  const body = check(raw);
  const row = await liveComment(id);
  if (row.authorId !== actor.id) throw new CommentError("You can only edit your own comments.");
  if (row.body === body) return;
  await db.update(updateComment).set({ body, editedAt: new Date() }).where(eq(updateComment.id, id));
}

/* Authors removing their own words: gone entirely, nothing to keep */
export async function deleteOwnComment(actor: CurrentUser, id: string) {
  const row = await liveComment(id);
  if (row.authorId !== actor.id) throw new CommentError("You can only delete your own comments.");
  await db.delete(updateComment).where(eq(updateComment.id, id));
}

/* Organizer moderation: placeholder in the thread, original text in the audit log */
export async function removeComment(actor: CurrentUser, id: string) {
  if (!can.manageContent(actor.role)) throw new CommentError("Only organizers can remove comments.");
  await db.transaction(async (tx) => {
    const [row] = await tx.select().from(updateComment).where(eq(updateComment.id, id)).for("update");
    if (!row) throw new CommentError("That comment no longer exists.");
    if (row.removedAt) throw new CommentError("That comment was already removed.");
    await tx
      .update(updateComment)
      .set({ body: "", removedAt: new Date(), removedBy: actor.id })
      .where(eq(updateComment.id, id));
    await tx.insert(auditLog).values({
      id: randomUUID(),
      actorId: actor.id,
      action: "update.comment_removed",
      targetUserId: row.authorId,
      detail: { updateId: row.updateId, commentId: id, text: row.body, postedAt: row.createdAt.toISOString() },
    });
  });
}

/* All comments for the given updates, oldest first */
export async function loadComments(updateIds: string[]): Promise<Map<string, CommentView[]>> {
  const out = new Map<string, CommentView[]>(updateIds.map((id) => [id, []]));
  if (updateIds.length === 0) return out;

  const rows = await db
    .select({
      id: updateComment.id,
      updateId: updateComment.updateId,
      authorId: updateComment.authorId,
      authorName: user.name,
      body: updateComment.body,
      createdAt: updateComment.createdAt,
      editedAt: updateComment.editedAt,
      removedAt: updateComment.removedAt,
    })
    .from(updateComment)
    .innerJoin(user, eq(user.id, updateComment.authorId))
    .where(inArray(updateComment.updateId, updateIds))
    .orderBy(asc(updateComment.createdAt));

  for (const r of rows) {
    out.get(r.updateId)?.push({
      id: r.id,
      authorId: r.authorId,
      authorName: r.authorName,
      body: r.body,
      createdAt: r.createdAt.toISOString(),
      editedAt: r.editedAt?.toISOString() ?? null,
      removed: r.removedAt !== null,
    });
  }
  return out;
}

/* Live comment counts only (for the dashboard card) */
export async function countComments(updateIds: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>(updateIds.map((id) => [id, 0]));
  if (updateIds.length === 0) return out;
  const rows = await db
    .select({ updateId: updateComment.updateId, n: count() })
    .from(updateComment)
    .where(and(inArray(updateComment.updateId, updateIds), isNull(updateComment.removedAt)))
    .groupBy(updateComment.updateId);
  for (const r of rows) out.set(r.updateId, r.n);
  return out;
}
