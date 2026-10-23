import "server-only";
import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { auditLog, poll, pollOption, pollVote, POLL_RESULTS } from "@/db/schema";
import { can } from "@/lib/roles";
import type { CurrentUser } from "@/lib/session";

/*
  Class polls: the only code that writes the poll tables.
  - Organizers create, close and delete polls (audited, one transaction).
  - Every signed-in classmate gets one vote per poll and may change it
    while the poll is open. The database enforces one row per person and
    that the chosen option belongs to that poll.
  - Ballots are secret: no read here returns who chose what, not even to
    organizers. Only totals per option, and only when the poll's
    show_results rule allows it. Individual votes are not audited for the
    same reason.
*/

export class PollError extends Error {}

export type PollResults = (typeof POLL_RESULTS)[number];

export type PollView = {
  id: string;
  question: string;
  details: string | null;
  createdAt: string;
  closesAt: string;
  endedAt: string | null; // when voting actually stopped: early close or the deadline
  closed: boolean;
  showResults: PollResults;
  /* Option counts are null when results are hidden from this viewer */
  options: { id: string; label: string; votes: number | null }[];
  totalVotes: number; // turnout is always shown, it reveals no choice
  myOptionId: string | null;
  resultsVisible: boolean;
};

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 10;
const MAX_OPEN_DAYS = 400;

function clean(s: string) {
  return s
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim();
}

const oneLine = (s: string) => clean(s).replace(/\s+/g, " ");

const pollSchema = z.object({
  question: z
    .string()
    .transform(oneLine)
    .pipe(z.string().min(1, "Write the question").max(200, "Keep the question under 200 characters")),
  details: z
    .string()
    .nullable()
    .optional()
    .transform((v) => (v ? clean(v) : "") || null)
    .pipe(z.string().max(1000, "Keep the details under 1,000 characters").nullable()),
  options: z
    .array(z.string().transform(oneLine))
    .transform((list) => list.filter(Boolean))
    .pipe(
      z
        .array(z.string().max(120, "Keep each choice under 120 characters"))
        .min(MIN_OPTIONS, `Add at least ${MIN_OPTIONS} choices`)
        .max(MAX_OPTIONS, `Use at most ${MAX_OPTIONS} choices`)
        .refine((list) => new Set(list.map((o) => o.toLowerCase())).size === list.length, "Two choices are the same"),
    ),
  closesAt: z.date({ error: "Pick when the poll closes" }),
  showResults: z.enum(POLL_RESULTS),
});

export type PollInput = z.input<typeof pollSchema>;

function assertStaff(actor: CurrentUser) {
  if (!can.manageContent(actor.role)) throw new PollError("Only organizers can manage polls.");
}

const isOpen = (p: { closedAt: Date | null; closesAt: Date }, now = new Date()) =>
  p.closedAt === null && p.closesAt > now;

/* ---------- Organizer writes ---------- */

export async function createPoll(actor: CurrentUser, input: PollInput) {
  assertStaff(actor);
  const r = pollSchema.safeParse(input);
  if (!r.success) throw new PollError(r.error.issues[0]?.message ?? "Check the form and try again.");
  const data = r.data;

  const now = Date.now();
  if (data.closesAt.getTime() < now + 10 * 60_000) throw new PollError("Set the closing time at least 10 minutes from now.");
  if (data.closesAt.getTime() > now + MAX_OPEN_DAYS * 86_400_000) throw new PollError("A poll can stay open for at most 400 days.");

  const id = randomUUID();
  await db.transaction(async (tx) => {
    await tx.insert(poll).values({
      id,
      question: data.question,
      details: data.details,
      createdBy: actor.id,
      closesAt: data.closesAt,
      showResults: data.showResults,
    });
    await tx.insert(pollOption).values(
      data.options.map((label, position) => ({ id: randomUUID(), pollId: id, label, position })),
    );
    await tx.insert(auditLog).values({
      id: randomUUID(),
      actorId: actor.id,
      action: "poll.created",
      detail: { pollId: id, question: data.question, options: data.options.length },
    });
  });
  return { id };
}

export async function closePoll(actor: CurrentUser, id: string) {
  assertStaff(actor);
  await db.transaction(async (tx) => {
    // Row lock: waits for any vote being cast right now, then blocks new ones
    const [p] = await tx.select().from(poll).where(eq(poll.id, id)).for("update");
    if (!p) throw new PollError("That poll no longer exists.");
    if (!isOpen(p)) throw new PollError("That poll is already closed.");
    await tx.update(poll).set({ closedAt: new Date() }).where(eq(poll.id, id));
    await tx.insert(auditLog).values({
      id: randomUUID(),
      actorId: actor.id,
      action: "poll.closed",
      detail: { pollId: id, question: p.question },
    });
  });
}

export async function deletePoll(actor: CurrentUser, id: string) {
  assertStaff(actor);
  await db.transaction(async (tx) => {
    const [p] = await tx.select().from(poll).where(eq(poll.id, id)).for("update");
    if (!p) throw new PollError("That poll was already deleted.");
    const [{ n }] = await tx.select({ n: sql<number>`count(*)::int` }).from(pollVote).where(eq(pollVote.pollId, id));
    await tx.delete(poll).where(eq(poll.id, id)); // options and votes cascade
    await tx.insert(auditLog).values({
      id: randomUUID(),
      actorId: actor.id,
      action: "poll.deleted",
      detail: { pollId: id, question: p.question, votes: n, createdAt: p.createdAt.toISOString() },
    });
  });
}

/* ---------- Classmate vote ---------- */

export async function castVote(actor: CurrentUser, pollId: string, optionId: string) {
  await db.transaction(async (tx) => {
    // Shared lock: many votes can run together, but not alongside a close
    const [p] = await tx
      .select({ closedAt: poll.closedAt, closesAt: poll.closesAt })
      .from(poll)
      .where(eq(poll.id, pollId))
      .for("share");
    if (!p) throw new PollError("That poll no longer exists.");
    if (!isOpen(p)) throw new PollError("This poll has closed.");

    const [opt] = await tx
      .select({ id: pollOption.id })
      .from(pollOption)
      .where(and(eq(pollOption.id, optionId), eq(pollOption.pollId, pollId)));
    if (!opt) throw new PollError("Pick one of the choices.");

    await tx
      .insert(pollVote)
      .values({ pollId, userId: actor.id, optionId })
      .onConflictDoUpdate({
        target: [pollVote.pollId, pollVote.userId],
        set: { optionId, votedAt: new Date() },
      });
  });
}

/* ---------- Reads ---------- */

/* Open polls first (closing soonest on top), then closed ones newest first */
export async function listPolls(viewer: CurrentUser, opts?: { limit?: number; openOnly?: boolean }): Promise<PollView[]> {
  const polls = await db.select().from(poll).orderBy(desc(poll.createdAt));
  const now = new Date();

  let rows = polls
    .map((p) => ({ ...p, open: isOpen(p, now) }))
    .filter((p) => !opts?.openOnly || p.open)
    .sort((a, b) =>
      a.open !== b.open
        ? a.open ? -1 : 1
        : a.open
          ? a.closesAt.getTime() - b.closesAt.getTime()
          : b.createdAt.getTime() - a.createdAt.getTime(),
    );
  if (opts?.limit) rows = rows.slice(0, opts.limit);
  if (rows.length === 0) return [];

  const ids = rows.map((p) => p.id);
  const [options, counts, mine] = await Promise.all([
    db.select().from(pollOption).where(inArray(pollOption.pollId, ids)).orderBy(asc(pollOption.position)),
    db
      .select({ optionId: pollVote.optionId, n: sql<number>`count(*)::int` })
      .from(pollVote)
      .where(inArray(pollVote.pollId, ids))
      .groupBy(pollVote.optionId),
    db
      .select({ pollId: pollVote.pollId, optionId: pollVote.optionId })
      .from(pollVote)
      .where(and(eq(pollVote.userId, viewer.id), inArray(pollVote.pollId, ids))),
  ]);

  const countBy = new Map(counts.map((c) => [c.optionId, c.n]));
  const myVote = new Map(mine.map((m) => [m.pollId, m.optionId]));

  return rows.map((p) => {
    const myOptionId = myVote.get(p.id) ?? null;
    const resultsVisible = !p.open || (p.showResults === "after_vote" && myOptionId !== null);
    const opts = options.filter((o) => o.pollId === p.id);
    return {
      id: p.id,
      question: p.question,
      details: p.details,
      createdAt: p.createdAt.toISOString(),
      closesAt: p.closesAt.toISOString(),
      endedAt: p.open ? null : (p.closedAt ?? p.closesAt).toISOString(),
      closed: !p.open,
      showResults: p.showResults,
      options: opts.map((o) => ({
        id: o.id,
        label: o.label,
        votes: resultsVisible ? (countBy.get(o.id) ?? 0) : null,
      })),
      totalVotes: opts.reduce((sum, o) => sum + (countBy.get(o.id) ?? 0), 0),
      myOptionId,
      resultsVisible,
    };
  });
}
