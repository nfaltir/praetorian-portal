import "server-only";
import { randomUUID } from "node:crypto";
import { and, asc, count, desc, eq, gt, isNull, lt, ne, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { message, messageThread, user } from "@/db/schema";
import { can } from "@/lib/roles";
import type { CurrentUser } from "@/lib/session";

/*
  Messages between classmates and the organizers. The only code that
  touches the message tables.

  Access rule, checked on every read and write:
  - the classmate who started a thread can see and reply to it,
  - any staff member can see and reply to every thread,
  - nobody else can, and a thread they can't see is reported as missing.

  "Side" of a message: it is from the organizers when the author is not
  the thread's classmate. Read state is kept per side (the classmate, and
  the shared staff inbox).
*/

export class MessageError extends Error {}

const SUBJECT_MAX = 120;
const BODY_MAX = 4000;
const SENDS_PER_HOUR = 20; // a person writing normally never hits this

function clean(s: string) {
  return s
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim();
}

const subjectSchema = z
  .string()
  .transform(clean)
  .pipe(z.string().min(1, "Add a subject").max(SUBJECT_MAX, `Keep the subject under ${SUBJECT_MAX} characters`));

const bodySchema = z
  .string()
  .transform(clean)
  .pipe(z.string().min(1, "Write a message").max(BODY_MAX, "Keep the message under 4,000 characters"));

function check<T>(schema: z.ZodType<T>, value: unknown): T {
  const r = schema.safeParse(value);
  if (!r.success) throw new MessageError(r.error.issues[0]?.message ?? "Check the form and try again.");
  return r.data;
}

type ThreadRow = typeof messageThread.$inferSelect;

function canSee(actor: CurrentUser, thread: Pick<ThreadRow, "memberId">) {
  return thread.memberId === actor.id || can.manageContent(actor.role);
}

/* true when this actor writes as the organizer side of this thread */
function isOrganizerSide(actor: CurrentUser, thread: Pick<ThreadRow, "memberId">) {
  return thread.memberId !== actor.id;
}

async function getThreadFor(actor: CurrentUser, threadId: string) {
  const thread = await db.query.messageThread.findFirst({ where: eq(messageThread.id, threadId) });
  if (!thread || !canSee(actor, thread)) throw new MessageError("That conversation doesn't exist.");
  return thread;
}

async function assertNotFlooding(actor: CurrentUser) {
  const since = new Date(Date.now() - 3_600_000);
  const [row] = await db
    .select({ n: count() })
    .from(message)
    .where(and(eq(message.authorId, actor.id), gt(message.createdAt, since)));
  if ((row?.n ?? 0) >= SENDS_PER_HOUR) {
    throw new MessageError("You've sent a lot of messages in the last hour. Please try again later.");
  }
}

/* ---------- Writes ---------- */

/* A classmate (or staff member, as themselves) starts a conversation with the organizers */
export async function startThread(actor: CurrentUser, input: { subject: string; body: string }) {
  const subject = check(subjectSchema, input.subject);
  const body = check(bodySchema, input.body);
  await assertNotFlooding(actor);

  const threadId = randomUUID();
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.insert(messageThread).values({
      id: threadId,
      memberId: actor.id,
      subject,
      createdAt: now,
      lastMessageAt: now,
      lastAuthorIsStaff: false,
      memberReadAt: now,
    });
    await tx.insert(message).values({
      id: randomUUID(),
      threadId,
      authorId: actor.id,
      fromStaff: false,
      body,
      createdAt: now,
    });
  });
  return { threadId };
}

export async function reply(actor: CurrentUser, threadId: string, input: { body: string }) {
  const body = check(bodySchema, input.body);
  const thread = await getThreadFor(actor, threadId);
  await assertNotFlooding(actor);

  const fromStaff = isOrganizerSide(actor, thread);
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.insert(message).values({ id: randomUUID(), threadId, authorId: actor.id, fromStaff, body, createdAt: now });
    await tx
      .update(messageThread)
      .set({
        lastMessageAt: now,
        lastAuthorIsStaff: fromStaff,
        // The writer has obviously read it; a reply also reopens a closed thread
        ...(fromStaff ? { staffReadAt: now } : { memberReadAt: now }),
        closedAt: null,
      })
      .where(eq(messageThread.id, threadId));
  });
}

export async function markRead(actor: CurrentUser, threadId: string) {
  const thread = await getThreadFor(actor, threadId);
  const now = new Date();
  await db
    .update(messageThread)
    .set(isOrganizerSide(actor, thread) ? { staffReadAt: now } : { memberReadAt: now })
    .where(eq(messageThread.id, threadId));
}

/* Organizers mark a conversation resolved (or reopen it) */
export async function setClosed(actor: CurrentUser, threadId: string, closed: boolean) {
  if (!can.manageContent(actor.role)) throw new MessageError("Only organizers can close conversations.");
  await getThreadFor(actor, threadId);
  await db
    .update(messageThread)
    .set({ closedAt: closed ? new Date() : null })
    .where(eq(messageThread.id, threadId));
}

/* ---------- Reads ---------- */

export type ThreadSummary = {
  id: string;
  subject: string;
  memberId: string;
  memberName: string;
  lastMessageAt: string;
  closed: boolean;
  unread: boolean;
  /* true when the last message came from the organizer side */
  lastFromStaff: boolean;
};

function unreadFor(actor: CurrentUser, t: ThreadRow) {
  const organizer = isOrganizerSide(actor, t);
  const lastFromOtherSide = organizer ? !t.lastAuthorIsStaff : t.lastAuthorIsStaff;
  const readAt = organizer ? t.staffReadAt : t.memberReadAt;
  return lastFromOtherSide && (!readAt || readAt < t.lastMessageAt);
}

/* Staff: every thread. Classmates: their own. Newest activity first. */
export async function listThreads(actor: CurrentUser): Promise<ThreadSummary[]> {
  const rows = await db
    .select({ thread: messageThread, memberName: user.name })
    .from(messageThread)
    .innerJoin(user, eq(user.id, messageThread.memberId))
    .where(can.manageContent(actor.role) ? undefined : eq(messageThread.memberId, actor.id))
    .orderBy(desc(messageThread.lastMessageAt));

  return rows.map(({ thread: t, memberName }) => ({
    id: t.id,
    subject: t.subject,
    memberId: t.memberId,
    memberName,
    lastMessageAt: t.lastMessageAt.toISOString(),
    closed: Boolean(t.closedAt),
    unread: unreadFor(actor, t),
    lastFromStaff: t.lastAuthorIsStaff,
  }));
}

export type ThreadDetail = ThreadSummary & {
  messages: { id: string; authorName: string; fromStaff: boolean; mine: boolean; body: string; createdAt: string }[];
};

/* null when the thread doesn't exist or the actor may not see it (the page 404s) */
export async function loadThread(actor: CurrentUser, threadId: string): Promise<ThreadDetail | null> {
  const row = await db
    .select({ thread: messageThread, memberName: user.name })
    .from(messageThread)
    .innerJoin(user, eq(user.id, messageThread.memberId))
    .where(eq(messageThread.id, threadId))
    .limit(1);
  const found = row[0];
  if (!found || !canSee(actor, found.thread)) return null;

  const msgs = await db
    .select({
      id: message.id,
      authorId: message.authorId,
      authorName: user.name,
      fromStaff: message.fromStaff,
      body: message.body,
      createdAt: message.createdAt,
    })
    .from(message)
    .innerJoin(user, eq(user.id, message.authorId))
    .where(eq(message.threadId, threadId))
    .orderBy(asc(message.createdAt));

  const t = found.thread;
  return {
    id: t.id,
    subject: t.subject,
    memberId: t.memberId,
    memberName: found.memberName,
    lastMessageAt: t.lastMessageAt.toISOString(),
    closed: Boolean(t.closedAt),
    unread: unreadFor(actor, t),
    lastFromStaff: t.lastAuthorIsStaff,
    messages: msgs.map((m) => ({
      id: m.id,
      authorName: m.authorName,
      fromStaff: m.fromStaff,
      mine: m.authorId === actor.id,
      body: m.body,
      createdAt: m.createdAt.toISOString(),
    })),
  };
}

/* Conversations with something new for this person (sidebar badge) */
export async function countUnread(actor: CurrentUser): Promise<number> {
  const unreadAsMember = and(
    eq(messageThread.memberId, actor.id),
    eq(messageThread.lastAuthorIsStaff, true),
    or(isNull(messageThread.memberReadAt), lt(messageThread.memberReadAt, messageThread.lastMessageAt)),
  );
  const unreadAsStaff = and(
    ne(messageThread.memberId, actor.id),
    eq(messageThread.lastAuthorIsStaff, false),
    or(isNull(messageThread.staffReadAt), lt(messageThread.staffReadAt, messageThread.lastMessageAt)),
  );

  const [row] = await db
    .select({ n: count() })
    .from(messageThread)
    .where(can.manageContent(actor.role) ? or(unreadAsMember, unreadAsStaff) : unreadAsMember);
  return row?.n ?? 0;
}