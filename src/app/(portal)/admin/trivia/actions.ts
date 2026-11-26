"use server";

import { revalidatePath } from "next/cache";
import { can } from "@/lib/roles";
import { requirePermission } from "@/lib/session";
import { limitAction } from "@/server/rate-limit";
import { createCard, deleteCard, setCardActive, TriviaError, updateCard } from "@/server/trivia";

/*
  Trivia card server actions. Organizers only: requirePermission 404s anyone
  else, then src/server/trivia.ts checks the role again.
*/

type CardValues = { question: string; answer: string };

export type TriviaActionResult = {
  ok: boolean;
  message?: string;
  /* Echoed back on error so the form keeps what was typed */
  values?: CardValues;
} | null;

function field(form: FormData, name: string, max: number) {
  return String(form.get(name) ?? "").slice(0, max);
}

function readCard(form: FormData): CardValues {
  return {
    // A little over the limits so the server, not truncation, reports "too long"
    question: field(form, "question", 400),
    answer: field(form, "answer", 240),
  };
}

async function run(fn: () => Promise<string>, values?: CardValues): Promise<TriviaActionResult> {
  try {
    const message = await fn();
    revalidatePath("/admin/trivia");
    revalidatePath("/games/praetorian-trivia");
    return { ok: true, message };
  } catch (e) {
    if (e instanceof TriviaError) return { ok: false, message: e.message, values };
    throw e;
  }
}

export async function createCardAction(_prev: TriviaActionResult, form: FormData): Promise<TriviaActionResult> {
  const actor = await requirePermission(can.manageContent);
  const blocked = await limitAction("write", actor.id);
  if (blocked) return { ok: false, message: blocked, values: readCard(form) };
  const values = readCard(form);
  return run(async () => {
    await createCard(actor, values);
    return "Card added. It's in the deck.";
  }, values);
}

export async function editCardAction(_prev: TriviaActionResult, form: FormData): Promise<TriviaActionResult> {
  const actor = await requirePermission(can.manageContent);
  const blocked = await limitAction("write", actor.id);
  if (blocked) return { ok: false, message: blocked, values: readCard(form) };
  const id = field(form, "id", 64);
  const values = readCard(form);
  return run(async () => {
    await updateCard(actor, id, values);
    return "Card saved.";
  }, values);
}

export async function toggleCardAction(_prev: TriviaActionResult, form: FormData): Promise<TriviaActionResult> {
  const actor = await requirePermission(can.manageContent);
  const blocked = await limitAction("write", actor.id);
  if (blocked) return { ok: false, message: blocked };
  const id = field(form, "id", 64);
  const active = form.get("active") === "true";
  return run(async () => {
    await setCardActive(actor, id, active);
    return active ? "Card is back in the deck." : "Card switched off.";
  });
}

export async function deleteCardAction(_prev: TriviaActionResult, form: FormData): Promise<TriviaActionResult> {
  const actor = await requirePermission(can.manageContent);
  const blocked = await limitAction("write", actor.id);
  if (blocked) return { ok: false, message: blocked };
  const id = field(form, "id", 64);
  return run(async () => {
    await deleteCard(actor, id);
    return "Card deleted.";
  });
}
