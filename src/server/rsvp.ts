import "server-only";
import { randomUUID } from "node:crypto";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { auditLog, rsvp, RSVP_STATUSES, user } from "@/db/schema";
import { can } from "@/lib/roles";
import type { CurrentUser } from "@/lib/session";

/*
  RSVPs: the only code that writes the rsvp table.
  - Organizers record and change RSVPs; classmates only read them.
  - Every write and its audit record happen in ONE transaction, with the
    previous value kept in the audit detail so changes can be traced.
  - Everything here is visible to every signed-in classmate by design.
*/

export class RsvpError extends Error {}

export type RsvpStatus = (typeof RSVP_STATUSES)[number];

export type RsvpEntry = {
  userId: string;
  name: string;
  status: RsvpStatus | null; // null = not replied
  guests: number;
  bringing: string | null;
  updatedAt: string | null;
};

export type RsvpTotals = {
  attending: number;
  maybe: number;
  notAttending: number;
  noReply: number;
  guests: number;
  headcount: number; // attending classmates + their guests
};

export const MAX_GUESTS = 5;

const oneLine = (s: string) =>
  s.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim();

const rsvpSchema = z
  .object({
    status: z.enum(RSVP_STATUSES, { error: "Pick attending, maybe or not attending" }),
    guests: z.coerce
      .number({ error: "Guests must be a number" })
      .int("Guests must be a whole number")
      .min(0, "Guests can't be negative")
      .max(MAX_GUESTS, `At most ${MAX_GUESTS} guests`),
    bringing: z
      .string()
      .nullable()
      .optional()
      .transform((v) => (v ? oneLine(v) : "") || null)
      .pipe(z.string().max(80, "Keep what they're bringing under 80 characters").nullable()),
  })
  // Extras only apply to attending; clear them instead of erroring, so
  // switching someone to "maybe" never fails on leftover fields
  .transform((d) => (d.status === "attending" ? d : { ...d, guests: 0, bringing: null }));

export type RsvpInput = z.input<typeof rsvpSchema>;

function assertStaff(actor: CurrentUser) {
  if (!can.manageMembers(actor.role)) throw new RsvpError("Only organizers can record RSVPs.");
}

async function activeClassmate(id: string) {
  const row = await db.query.user.findFirst({
    columns: { id: true, name: true, disabled: true },
    where: eq(user.id, id),
  });
  if (!row || row.disabled) throw new RsvpError("That classmate isn't on the list.");
  return row;
}

export async function setRsvp(actor: CurrentUser, userId: string, input: RsvpInput) {
  assertStaff(actor);
  const r = rsvpSchema.safeParse(input);
  if (!r.success) throw new RsvpError(r.error.issues[0]?.message ?? "Check the form and try again.");
  const data = r.data;
  const target = await activeClassmate(userId);

  await db.transaction(async (tx) => {
    const [before] = await tx.select().from(rsvp).where(eq(rsvp.userId, userId)).for("update");
    const now = new Date();
    await tx
      .insert(rsvp)
      .values({ userId, ...data, updatedAt: now, updatedBy: actor.id })
      .onConflictDoUpdate({ target: rsvp.userId, set: { ...data, updatedAt: now, updatedBy: actor.id } });
    await tx.insert(auditLog).values({
      id: randomUUID(),
      actorId: actor.id,
      action: "rsvp.set",
      targetUserId: userId,
      detail: {
        name: target.name,
        to: data,
        from: before ? { status: before.status, guests: before.guests, bringing: before.bringing } : null,
      },
    });
  });
}

/* Back to "not replied" (e.g. recorded for the wrong person) */
export async function clearRsvp(actor: CurrentUser, userId: string) {
  assertStaff(actor);
  await db.transaction(async (tx) => {
    const [before] = await tx.select().from(rsvp).where(eq(rsvp.userId, userId)).for("update");
    if (!before) throw new RsvpError("There's no RSVP to clear.");
    await tx.delete(rsvp).where(eq(rsvp.userId, userId));
    await tx.insert(auditLog).values({
      id: randomUUID(),
      actorId: actor.id,
      action: "rsvp.cleared",
      targetUserId: userId,
      detail: { from: { status: before.status, guests: before.guests, bringing: before.bringing } },
    });
  });
}

/* ---------- Reads ---------- */

/* Every active classmate, replied or not, alphabetical */
export async function loadRsvpBoard(): Promise<{ entries: RsvpEntry[]; totals: RsvpTotals }> {
  const rows = await db
    .select({
      userId: user.id,
      name: user.name,
      status: rsvp.status,
      guests: rsvp.guests,
      bringing: rsvp.bringing,
      updatedAt: rsvp.updatedAt,
    })
    .from(user)
    .leftJoin(rsvp, eq(rsvp.userId, user.id))
    .where(eq(user.disabled, false))
    .orderBy(asc(user.name));

  const entries: RsvpEntry[] = rows.map((r) => ({
    userId: r.userId,
    name: r.name,
    status: r.status ?? null,
    guests: r.guests ?? 0,
    bringing: r.bringing ?? null,
    updatedAt: r.updatedAt?.toISOString() ?? null,
  }));

  const totals: RsvpTotals = { attending: 0, maybe: 0, notAttending: 0, noReply: 0, guests: 0, headcount: 0 };
  for (const e of entries) {
    if (e.status === "attending") {
      totals.attending++;
      totals.guests += e.guests;
    } else if (e.status === "maybe") totals.maybe++;
    else if (e.status === "not_attending") totals.notAttending++;
    else totals.noReply++;
  }
  totals.headcount = totals.attending + totals.guests;

  return { entries, totals };
}
