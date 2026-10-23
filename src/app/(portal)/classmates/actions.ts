"use server";

import { revalidatePath } from "next/cache";
import { can } from "@/lib/roles";
import { requirePermission } from "@/lib/session";
import { clearRsvp, RsvpError, setRsvp } from "@/server/rsvp";

/*
  RSVP server actions. Organizers only: requirePermission 404s anyone
  else, then src/server/rsvp.ts checks the role and validates again.
*/

export type RsvpActionResult = { ok: boolean; message?: string } | null;

function field(form: FormData, name: string, max: number) {
  return String(form.get(name) ?? "").slice(0, max);
}

async function run(fn: () => Promise<string>): Promise<RsvpActionResult> {
  try {
    const message = await fn();
    revalidatePath("/classmates");
    revalidatePath("/");
    return { ok: true, message };
  } catch (e) {
    if (e instanceof RsvpError) return { ok: false, message: e.message };
    throw e;
  }
}

export async function setRsvpAction(_prev: RsvpActionResult, form: FormData): Promise<RsvpActionResult> {
  const actor = await requirePermission(can.manageMembers);
  const userId = field(form, "userId", 64);
  return run(async () => {
    await setRsvp(actor, userId, {
      status: field(form, "status", 20) as "attending" | "maybe" | "not_attending", // zod rejects anything else
      guests: field(form, "guests", 3) || "0",
      // A little over the limit so the server, not truncation, reports "too long"
      bringing: field(form, "bringing", 120),
    });
    return "RSVP saved.";
  });
}

export async function clearRsvpAction(_prev: RsvpActionResult, form: FormData): Promise<RsvpActionResult> {
  const actor = await requirePermission(can.manageMembers);
  const userId = field(form, "userId", 64);
  return run(async () => {
    await clearRsvp(actor, userId);
    return "RSVP cleared.";
  });
}
