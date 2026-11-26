import "server-only";
import { randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { auditLog, triviaCard, user } from "@/db/schema";
import { can } from "@/lib/roles";
import type { CurrentUser } from "@/lib/session";

/*
  Praetorian Trivia: the only code that writes the trivia_card table.
  - Organizers create, edit, switch off and delete cards; the game reads
    active cards for any signed-in classmate.
  - Each write and its audit record happen in ONE transaction. Edits keep
    the old and new text in the audit detail, so every change is traceable.
  - The game gets question and answer only, never who wrote the card.
*/

export class TriviaError extends Error {}

export type DeckCard = { id: string; question: string; answer: string };

export type AdminCard = DeckCard & {
  active: boolean;
  createdByName: string;
  createdAt: string;
  updatedAt: string | null;
};

function clean(s: string) {
  return s
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim();
}

const oneLine = (s: string) => clean(s).replace(/\s+/g, " ");

const cardSchema = z.object({
  question: z
    .string()
    .transform(oneLine)
    .pipe(z.string().min(1, "Write the question").max(280, "Keep the question under 280 characters")),
  answer: z
    .string()
    .transform(oneLine)
    .pipe(z.string().min(1, "Write the answer").max(160, "Keep the answer under 160 characters")),
});

export type TriviaInput = z.input<typeof cardSchema>;

function assertStaff(actor: CurrentUser) {
  if (!can.manageContent(actor.role)) throw new TriviaError("Only organizers can manage trivia cards.");
}

function check(input: TriviaInput) {
  const r = cardSchema.safeParse(input);
  if (!r.success) throw new TriviaError(r.error.issues[0]?.message ?? "Check the form and try again.");
  return r.data;
}

/* The deck for the game: active cards only. Callers must have a signed-in user. */
export async function loadDeck(): Promise<DeckCard[]> {
  return db
    .select({ id: triviaCard.id, question: triviaCard.question, answer: triviaCard.answer })
    .from(triviaCard)
    .where(eq(triviaCard.active, true));
}

/* Every card, newest first, for Staff Admin. */
export async function listCards(actor: CurrentUser): Promise<AdminCard[]> {
  assertStaff(actor);
  const rows = await db
    .select({
      id: triviaCard.id,
      question: triviaCard.question,
      answer: triviaCard.answer,
      active: triviaCard.active,
      createdByName: user.name,
      createdAt: triviaCard.createdAt,
      updatedAt: triviaCard.updatedAt,
    })
    .from(triviaCard)
    .innerJoin(user, eq(user.id, triviaCard.createdBy))
    .orderBy(desc(triviaCard.createdAt));
  return rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt ? r.updatedAt.toISOString() : null,
  }));
}

export async function createCard(actor: CurrentUser, input: TriviaInput) {
  assertStaff(actor);
  const data = check(input);
  const id = randomUUID();
  await db.transaction(async (tx) => {
    await tx.insert(triviaCard).values({ id, ...data, createdBy: actor.id });
    await tx.insert(auditLog).values({
      id: randomUUID(),
      actorId: actor.id,
      action: "trivia.card_created",
      detail: { cardId: id, question: data.question, answer: data.answer },
    });
  });
  return id;
}

export async function updateCard(actor: CurrentUser, id: string, input: TriviaInput) {
  assertStaff(actor);
  const data = check(input);
  await db.transaction(async (tx) => {
    const [before] = await tx
      .select({ question: triviaCard.question, answer: triviaCard.answer })
      .from(triviaCard)
      .where(eq(triviaCard.id, id));
    if (!before) throw new TriviaError("That card no longer exists.");
    await tx
      .update(triviaCard)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(triviaCard.id, id));
    await tx.insert(auditLog).values({
      id: randomUUID(),
      actorId: actor.id,
      action: "trivia.card_updated",
      detail: { cardId: id, before, after: data },
    });
  });
}

export async function setCardActive(actor: CurrentUser, id: string, active: boolean) {
  assertStaff(actor);
  await db.transaction(async (tx) => {
    const changed = await tx
      .update(triviaCard)
      .set({ active, updatedAt: new Date() })
      .where(eq(triviaCard.id, id))
      .returning({ question: triviaCard.question });
    if (changed.length === 0) throw new TriviaError("That card no longer exists.");
    await tx.insert(auditLog).values({
      id: randomUUID(),
      actorId: actor.id,
      action: active ? "trivia.card_enabled" : "trivia.card_disabled",
      detail: { cardId: id, question: changed[0]?.question },
    });
  });
}

export async function deleteCard(actor: CurrentUser, id: string) {
  assertStaff(actor);
  await db.transaction(async (tx) => {
    const gone = await tx
      .delete(triviaCard)
      .where(eq(triviaCard.id, id))
      .returning({ question: triviaCard.question, answer: triviaCard.answer });
    if (gone.length === 0) throw new TriviaError("That card no longer exists.");
    await tx.insert(auditLog).values({
      id: randomUUID(),
      actorId: actor.id,
      action: "trivia.card_deleted",
      detail: { cardId: id, ...gone[0] },
    });
  });
}
