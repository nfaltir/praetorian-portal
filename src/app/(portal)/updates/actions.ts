"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { can } from "@/lib/roles";
import { requirePermission } from "@/lib/session";
import { createUpdate, deleteUpdate, editUpdate, UpdateError } from "@/server/updates";

/*
  Updates server actions. Each re-checks on the server that the caller is
  staff (requirePermission 404s anyone else), then hands off to
  src/server/updates.ts, which validates again.
*/

type PostValues = { title: string; body: string; category: string };

export type UpdateActionResult = {
  ok: boolean;
  message?: string;
  /* Echoed back on error so the form keeps what was typed */
  values?: PostValues;
} | null;

function field(form: FormData, name: string, max: number) {
  return String(form.get(name) ?? "").slice(0, max);
}

function readPost(form: FormData): PostValues {
  return {
    // A little over the limits so the server, not truncation, reports "too long"
    title: field(form, "title", 200),
    body: field(form, "body", 6000),
    category: field(form, "category", 40),
  };
}

function refresh() {
  revalidatePath("/updates");
  revalidatePath("/");
}

async function run(fn: () => Promise<string>, values?: PostValues): Promise<UpdateActionResult> {
  try {
    const message = await fn();
    refresh();
    return { ok: true, message };
  } catch (e) {
    if (e instanceof UpdateError) return { ok: false, message: e.message, values };
    throw e;
  }
}

export async function createUpdateAction(_prev: UpdateActionResult, form: FormData): Promise<UpdateActionResult> {
  const actor = await requirePermission(can.manageContent);
  const values = readPost(form);
  const result = await run(async () => {
    await createUpdate(actor, values);
    return "Update posted.";
  }, values);
  // Outside run(): redirect works by throwing, and run() must not catch it
  if (result?.ok) redirect("/updates");
  return result;
}

export async function editUpdateAction(_prev: UpdateActionResult, form: FormData): Promise<UpdateActionResult> {
  const actor = await requirePermission(can.manageContent);
  const id = field(form, "id", 64);
  const values = readPost(form);
  return run(async () => {
    await editUpdate(actor, id, values);
    return "Update saved.";
  }, values);
}

export async function deleteUpdateAction(_prev: UpdateActionResult, form: FormData): Promise<UpdateActionResult> {
  const actor = await requirePermission(can.manageContent);
  const id = field(form, "id", 64);
  return run(async () => {
    await deleteUpdate(actor, id);
    return "Update deleted.";
  });
}