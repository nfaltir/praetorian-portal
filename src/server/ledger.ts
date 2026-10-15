import "server-only";
import { randomUUID } from "node:crypto";
import { asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { site } from "@/config/site";
import { db } from "@/db";
import { auditLog, contribution, user } from "@/db/schema";
import { can } from "@/lib/roles";
import type { CurrentUser } from "@/lib/session";
import type { LedgerEntry } from "@/lib/types";

/*
  Server-side ledger operations. The only code that writes contributions
  or targets. Every write:
  - checks the actor may manage the ledger (treasurer or superuser),
  - validates input,
  - writes the change and its audit record in ONE transaction.
  The database adds its own checks on top (positive amounts, append-only,
  reversals must match), so a bug here still can't corrupt history.
*/

export class LedgerError extends Error {}

const MAX_ENTRY_CENTS = 10_000_000; // $100,000, matches the DB check
const MAX_TARGET_CENTS = 1_000_000; // $10,000

/* "125", "125.5", "125.50", "$1,250.00" -> cents. Rejects anything else. */
export function parseDollars(input: unknown): number | null {
  if (typeof input !== "string") return null;
  const s = input.trim().replace(/^\$/, "").replace(/,/g, "");
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(s)) return null;
  const [whole, frac = ""] = s.split(".");
  return Number(whole) * 100 + Number(frac.padEnd(2, "0"));
}

/* Today's date in the portal's time zone, as YYYY-MM-DD */
export function todayInPortalZone(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: site.timeZone }).format(now);
}

const memoSchema = z
  .string()
  .trim()
  .max(200, "Keep the note under 200 characters")
  .transform((s) => (s.length ? s : null))
  .nullable()
  .optional();

const paymentSchema = z.object({
  memberId: z.string().min(1).max(64),
  amountCents: z.number().int().positive("Enter an amount above zero").max(MAX_ENTRY_CENTS, "That amount is too large"),
  paidOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter the payment date"),
  memo: memoSchema,
});

/* Validate, turning the first problem into a plain message for the form */
function check<T>(schema: z.ZodType<T>, value: unknown): T {
  const r = schema.safeParse(value);
  if (!r.success) throw new LedgerError(r.error.issues[0]?.message ?? "Check the form and try again.");
  return r.data;
}

function assertLedgerAccess(actor: CurrentUser) {
  if (!can.manageLedger(actor.role)) throw new LedgerError("Only treasurers can change contributions.");
}

export async function recordPayment(
  actor: CurrentUser,
  input: { memberId: string; amountCents: number; paidOn: string; memo?: string | null },
) {
  assertLedgerAccess(actor);
  const data = check(paymentSchema, input);

  if (data.paidOn > todayInPortalZone()) throw new LedgerError("The payment date can't be in the future.");
  if (data.paidOn < "2020-01-01") throw new LedgerError("Check the payment date.");

  const member = await db.query.user.findFirst({ columns: { id: true, name: true }, where: eq(user.id, data.memberId) });
  if (!member) throw new LedgerError("Unknown classmate.");

  const id = randomUUID();
  await db.transaction(async (tx) => {
    await tx.insert(contribution).values({
      id,
      memberId: member.id,
      kind: "payment",
      amountCents: data.amountCents,
      paidOn: data.paidOn,
      recordedBy: actor.id,
      memo: data.memo ?? null,
    });
    await tx.insert(auditLog).values({
      id: randomUUID(),
      actorId: actor.id,
      action: "ledger.payment_recorded",
      targetUserId: member.id,
      detail: { entryId: id, amountCents: data.amountCents, paidOn: data.paidOn },
    });
  });
  return { id, memberName: member.name };
}

export async function reverseEntry(actor: CurrentUser, input: { entryId: string; reason: string }) {
  assertLedgerAccess(actor);
  const reason = check(z.string().trim().min(3, "Say why it's being reversed").max(200, "Keep the reason under 200 characters"), input.reason);

  const original = await db.query.contribution.findFirst({ where: eq(contribution.id, input.entryId) });
  if (!original) throw new LedgerError("That entry doesn't exist.");
  if (original.kind !== "payment") throw new LedgerError("Only payments can be reversed.");

  const already = await db.query.contribution.findFirst({
    columns: { id: true },
    where: eq(contribution.reversesId, original.id),
  });
  if (already) throw new LedgerError("This entry was already reversed.");

  const id = randomUUID();
  try {
    await db.transaction(async (tx) => {
      await tx.insert(contribution).values({
        id,
        memberId: original.memberId,
        kind: "reversal",
        amountCents: original.amountCents,
        paidOn: original.paidOn,
        recordedBy: actor.id,
        reversesId: original.id,
        memo: reason,
      });
      await tx.insert(auditLog).values({
        id: randomUUID(),
        actorId: actor.id,
        action: "ledger.reversed",
        targetUserId: original.memberId,
        detail: { entryId: id, reverses: original.id, amountCents: original.amountCents, reason },
      });
    });
  } catch (e) {
    // Two treasurers reversing at the same moment: the unique index stops the second
    if (e instanceof Error && /contribution_reverses_once_idx/.test(String((e as { cause?: unknown }).cause ?? e.message))) {
      throw new LedgerError("This entry was already reversed.");
    }
    throw e;
  }
  return { id };
}

export async function setTarget(actor: CurrentUser, input: { memberId: string; targetCents: number }) {
  assertLedgerAccess(actor);
  const targetCents = check(
    z.number().int("Use whole cents").min(0, "Target can't be negative").max(MAX_TARGET_CENTS, "That target is too large"),
    input.targetCents,
  );

  const member = await db.query.user.findFirst({
    columns: { id: true, targetCents: true },
    where: eq(user.id, input.memberId),
  });
  if (!member) throw new LedgerError("Unknown classmate.");
  if (member.targetCents === targetCents) return;

  await db.transaction(async (tx) => {
    await tx.update(user).set({ targetCents }).where(eq(user.id, member.id));
    await tx.insert(auditLog).values({
      id: randomUUID(),
      actorId: actor.id,
      action: "member.target_changed",
      targetUserId: member.id,
      detail: { from: member.targetCents, to: targetCents },
    });
  });
}

/* ---------- Reads ---------- */

function toEntry(row: typeof contribution.$inferSelect): LedgerEntry {
  return {
    id: row.id,
    memberId: row.memberId,
    kind: row.kind,
    amountCents: row.amountCents,
    paidOn: row.paidOn,
    recordedAt: row.recordedAt.toISOString(),
    recordedBy: row.recordedBy,
    reversesId: row.reversesId ?? undefined,
    memo: row.memo ?? undefined,
  };
}

/* All entries, newest first. ~40 people over 4 years is a few hundred rows. */
export async function loadLedger(): Promise<LedgerEntry[]> {
  const rows = await db.select().from(contribution).orderBy(desc(contribution.recordedAt));
  return rows.map(toEntry);
}

export async function loadMemberLedger(memberId: string): Promise<LedgerEntry[]> {
  const rows = await db
    .select()
    .from(contribution)
    .where(eq(contribution.memberId, memberId))
    .orderBy(desc(contribution.recordedAt));
  return rows.map(toEntry);
}

/* Active (not disabled) members and their private targets. Staff-only data. */
export async function loadRoster() {
  const rows = await db
    .select({ id: user.id, name: user.name, username: user.username, targetCents: user.targetCents, disabled: user.disabled })
    .from(user)
    .orderBy(asc(user.name));
  return rows.filter((r) => !r.disabled);
}