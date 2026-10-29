"use server";

import { revalidatePath } from "next/cache";
import { can } from "@/lib/roles";
import { requirePermission, requireUser } from "@/lib/session";
import { limitAction } from "@/server/rate-limit";
import { CommentError, deleteOwnComment, editComment, postComment, removeComment } from "@/server/update-comments";

/*
  Comment actions. Posting, editing and deleting your own comment need any
  signed-in classmate; removing someone else's needs an organizer
  (requirePermission 404s anyone else). Every action shares the per-minute
  write limit; posting also has a 30-per-hour flood limit in the server code.
*/

export type CommentResult = { ok: boolean; message?: string; body?: string } | null;

function field(form: FormData, name: string, max: number) {
  return String(form.get(name) ?? "").slice(0, max);
}

async function run(fn: () => Promise<void>, body?: string): Promise<CommentResult> {
  try {
    await fn();
  } catch (e) {
    // Echo the text back so a failed post or edit doesn't lose what was typed
    if (e instanceof CommentError) return { ok: false, message: e.message, body };
    throw e;
  }
  revalidatePath("/updates");
  revalidatePath("/");
  return { ok: true };
}

export async function postCommentAction(_prev: CommentResult, form: FormData): Promise<CommentResult> {
  const actor = await requireUser();
  // A little over the limit so the server, not truncation, reports "too long"
  const body = field(form, "body", 1200);
  const blocked = await limitAction("write", actor.id);
  if (blocked) return { ok: false, message: blocked, body };
  return run(() => postComment(actor, field(form, "updateId", 64), body), body);
}

export async function editCommentAction(_prev: CommentResult, form: FormData): Promise<CommentResult> {
  const actor = await requireUser();
  const body = field(form, "body", 1200);
  const blocked = await limitAction("write", actor.id);
  if (blocked) return { ok: false, message: blocked, body };
  return run(() => editComment(actor, field(form, "id", 64), body), body);
}

export async function deleteCommentAction(_prev: CommentResult, form: FormData): Promise<CommentResult> {
  const actor = await requireUser();
  const blocked = await limitAction("write", actor.id);
  if (blocked) return { ok: false, message: blocked };
  return run(() => deleteOwnComment(actor, field(form, "id", 64)));
}

export async function removeCommentAction(_prev: CommentResult, form: FormData): Promise<CommentResult> {
  const actor = await requirePermission(can.manageContent);
  const blocked = await limitAction("write", actor.id);
  if (blocked) return { ok: false, message: blocked };
  return run(() => removeComment(actor, field(form, "id", 64)));
}
