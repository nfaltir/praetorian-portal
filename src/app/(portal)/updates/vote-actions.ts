"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { limitAction } from "@/server/rate-limit";
import { castUpdateVote, VoteError, type VoteValue } from "@/server/update-votes";

/*
  Vote on an update. Any signed-in classmate. Shares the "vote" rate limit
  with polls (20 per minute per person).
*/

export type VoteResult = { ok: boolean; message?: string } | null;

export async function voteUpdateAction(_prev: VoteResult, form: FormData): Promise<VoteResult> {
  const actor = await requireUser();
  const blocked = await limitAction("vote", actor.id);
  if (blocked) return { ok: false, message: blocked };

  const updateId = String(form.get("updateId") ?? "").slice(0, 64);
  const raw = String(form.get("value") ?? "");
  const value: VoteValue | null = raw === "1" ? 1 : raw === "-1" ? -1 : raw === "0" ? 0 : null;
  if (!updateId || value === null) return { ok: false, message: "Invalid vote." };

  try {
    await castUpdateVote(actor, updateId, value);
  } catch (e) {
    if (e instanceof VoteError) return { ok: false, message: e.message };
    throw e;
  }
  revalidatePath("/updates");
  return { ok: true };
}
