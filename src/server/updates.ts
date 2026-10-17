import "server-only";
import { randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { announcement, auditLog, UPDATE_CATEGORIES, user } from "@/db/schema";
import { can } from "@/lib/roles";
import type { CurrentUser } from "@/lib/session";
import type { Update } from "@/lib/types";

/*
  Class updates: the only code that writes the announcement table.
  Every write:
  - checks the actor is staff (chair, vice chair, treasurer, superuser),
  - validates and cleans the text,
  - writes the change and its audit record in ONE transaction.
  Posts are plain text. The page renders them as text, never as HTML.
*/

export class UpdateError extends Error {}

export type UpdatePost = Update & {
  body: string;
  authorName: string;
  editedAt: string | null;
};

/* Drop control characters (keep newlines and tabs), normalize line endings */
function clean(s: string) {
  return s
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim();
}

const postSchema = z.object({
  title: z
    .string()
    .transform(clean)
    .pipe(z.string().min(1, "Add a title").max(120, "Keep the title under 120 characters")),
  body: z
    .string()
    .transform(clean)
    .pipe(z.string().min(1, "Write the update").max(5000, "Keep the update under 5,000 characters")),
  category: z
    .enum(UPDATE_CATEGORIES)
    .nullable()
    .optional()
    .transform((v) => v ?? null),
});

type PostInput = { title: string; body: string; category?: string | null };

function check(value: unknown) {
  const r = postSchema.safeParse(value);
  if (!r.success) throw new UpdateError(r.error.issues[0]?.message ?? "Check the form and try again.");
  return r.data;
}

function assertStaff(actor: CurrentUser) {
  if (!can.manageContent(actor.role)) throw new UpdateError("Only organizers can post updates.");
}

export async function createUpdate(actor: CurrentUser, input: PostInput) {
  assertStaff(actor);
  const data = check({ ...input, category: input.category || null });

  const id = randomUUID();
  await db.transaction(async (tx) => {
    await tx.insert(announcement).values({ id, ...data, authorId: actor.id });
    await tx.insert(auditLog).values({
      id: randomUUID(),
      actorId: actor.id,
      action: "update.posted",
      detail: { updateId: id, title: data.title },
    });
  });
  return { id };
}

export async function editUpdate(actor: CurrentUser, id: string, input: PostInput) {
  assertStaff(actor);
  const data = check({ ...input, category: input.category || null });

  const existing = await db.query.announcement.findFirst({ columns: { id: true }, where: eq(announcement.id, id) });
  if (!existing) throw new UpdateError("That update no longer exists.");

  await db.transaction(async (tx) => {
    await tx.update(announcement).set({ ...data, editedAt: new Date() }).where(eq(announcement.id, id));
    await tx.insert(auditLog).values({
      id: randomUUID(),
      actorId: actor.id,
      action: "update.edited",
      detail: { updateId: id, title: data.title },
    });
  });
}

export async function deleteUpdate(actor: CurrentUser, id: string) {
  assertStaff(actor);

  const existing = await db.query.announcement.findFirst({
    columns: { id: true, title: true, authorId: true, publishedAt: true },
    where: eq(announcement.id, id),
  });
  if (!existing) throw new UpdateError("That update was already deleted.");

  await db.transaction(async (tx) => {
    await tx.delete(announcement).where(eq(announcement.id, id));
    // Keep a record of what was removed and by whom
    await tx.insert(auditLog).values({
      id: randomUUID(),
      actorId: actor.id,
      action: "update.deleted",
      targetUserId: existing.authorId,
      detail: { updateId: id, title: existing.title, publishedAt: existing.publishedAt.toISOString() },
    });
  });
}

/* ---------- Reads ---------- */

function excerptOf(body: string, max = 220) {
  const flat = body.replace(/\s+/g, " ").trim();
  return flat.length <= max ? flat : `${flat.slice(0, max).replace(/\s+\S*$/, "")}...`;
}

/* Newest first. A class portal has tens of posts, not thousands. */
export async function loadUpdates(limit?: number): Promise<UpdatePost[]> {
  const q = db
    .select({
      id: announcement.id,
      title: announcement.title,
      body: announcement.body,
      category: announcement.category,
      authorId: announcement.authorId,
      authorName: user.name,
      publishedAt: announcement.publishedAt,
      editedAt: announcement.editedAt,
    })
    .from(announcement)
    .innerJoin(user, eq(user.id, announcement.authorId))
    .orderBy(desc(announcement.publishedAt));

  const rows = limit ? await q.limit(limit) : await q;
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    body: r.body,
    excerpt: excerptOf(r.body),
    category: r.category ?? undefined,
    authorId: r.authorId,
    authorName: r.authorName,
    publishedAt: r.publishedAt.toISOString(),
    editedAt: r.editedAt?.toISOString() ?? null,
  }));
}