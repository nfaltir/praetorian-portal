"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { MessageError, reply, setClosed, startThread } from "@/server/messages";

/*
  Messages server actions. Every signed-in member may start and reply;
  src/server/messages.ts decides whether this person may touch this
  thread, so a forged thread id gets "doesn't exist", never someone
  else's conversation.
*/

export type MessageActionResult = {
  ok: boolean;
  message?: string;
  /* Echoed back on error so the form keeps what was typed */
  values?: { subject?: string; body: string };
} | null;

function field(form: FormData, name: string, max: number) {
  return String(form.get(name) ?? "").slice(0, max);
}

/* Messages change the sidebar badge on every page, so refresh the whole portal */
function refresh() {
  revalidatePath("/", "layout");
}

export async function startThreadAction(_prev: MessageActionResult, form: FormData): Promise<MessageActionResult> {
  const actor = await requireUser();
  const values = { subject: field(form, "subject", 200), body: field(form, "body", 5000) };

  let threadId: string;
  try {
    ({ threadId } = await startThread(actor, values));
  } catch (e) {
    if (e instanceof MessageError) return { ok: false, message: e.message, values };
    throw e;
  }
  refresh();
  redirect(`/messages/${threadId}`); // outside try: redirect works by throwing
}

export async function replyAction(_prev: MessageActionResult, form: FormData): Promise<MessageActionResult> {
  const actor = await requireUser();
  const threadId = field(form, "threadId", 64);
  const values = { body: field(form, "body", 5000) };

  try {
    await reply(actor, threadId, values);
  } catch (e) {
    if (e instanceof MessageError) return { ok: false, message: e.message, values };
    throw e;
  }
  refresh();
  return { ok: true };
}

export async function setClosedAction(_prev: MessageActionResult, form: FormData): Promise<MessageActionResult> {
  const actor = await requireUser();
  const threadId = field(form, "threadId", 64);
  const closed = field(form, "closed", 5) === "true";

  try {
    await setClosed(actor, threadId, closed);
  } catch (e) {
    if (e instanceof MessageError) return { ok: false, message: e.message };
    throw e;
  }
  refresh();
  return { ok: true, message: closed ? "Marked as resolved." : "Reopened." };
}