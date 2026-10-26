"use server";

import { limitAction } from "@/server/rate-limit";
import { revalidatePath } from "next/cache";
import { can } from "@/lib/roles";
import { requirePermission } from "@/lib/session";
import { money } from "@/lib/format";
import { LedgerError, parseDollars, recordPayment, reverseEntry, setTarget } from "@/server/ledger";

/*
  Treasury server actions. Each one re-checks on the server that the
  caller is a treasurer or the superuser (requirePermission 404s anyone
  else), then hands off to src/server/ledger.ts, which validates again.
*/

export type LedgerActionResult = {
  ok: boolean;
  message?: string;
  /* Echoed back on error so the form keeps what was typed */
  values?: Record<string, string>;
} | null;

function field(form: FormData, name: string, max = 200) {
  return String(form.get(name) ?? "").slice(0, max);
}

function refresh() {
  revalidatePath("/treasury");
  revalidatePath("/contributions");
  revalidatePath("/");
}

async function run(fn: () => Promise<string>, values?: Record<string, string>): Promise<LedgerActionResult> {
  try {
    const message = await fn();
    refresh();
    return { ok: true, message };
  } catch (e) {
    if (e instanceof LedgerError) return { ok: false, message: e.message, values };
    throw e;
  }
}

export async function recordPaymentAction(_prev: LedgerActionResult, form: FormData): Promise<LedgerActionResult> {
  const actor = await requirePermission(can.manageLedger);
  const blocked = await limitAction("write", actor.id);
  if (blocked) return { ok: false, message: blocked };
  const values = {
    memberId: field(form, "memberId", 64),
    amount: field(form, "amount", 20),
    paidOn: field(form, "paidOn", 10),
    memo: field(form, "memo"),
  };

  const amountCents = parseDollars(values.amount);
  if (amountCents === null) return { ok: false, message: "Enter an amount like 50 or 50.25", values };
  if (!values.memberId) return { ok: false, message: "Choose a classmate", values };

  return run(async () => {
    const r = await recordPayment(actor, {
      memberId: values.memberId,
      amountCents,
      paidOn: values.paidOn,
      memo: values.memo,
    });
    return `Recorded ${money(amountCents)} for ${r.memberName}.`;
  }, values);
}

export async function reverseEntryAction(_prev: LedgerActionResult, form: FormData): Promise<LedgerActionResult> {
  const actor = await requirePermission(can.manageLedger);
  const blocked = await limitAction("write", actor.id);
  if (blocked) return { ok: false, message: blocked };
  const entryId = field(form, "entryId", 64);
  const reason = field(form, "reason");

  return run(async () => {
    await reverseEntry(actor, { entryId, reason });
    return "Entry reversed. Record the correct payment if one is needed.";
  }, { reason });
}

export async function setTargetAction(_prev: LedgerActionResult, form: FormData): Promise<LedgerActionResult> {
  const actor = await requirePermission(can.manageTargets);
  const blocked = await limitAction("write", actor.id);
  if (blocked) return { ok: false, message: blocked };
  const memberId = field(form, "memberId", 64);
  const target = field(form, "target", 20);

  const targetCents = parseDollars(target);
  if (targetCents === null) return { ok: false, message: "Enter a target like 400 or 200", values: { target } };

  return run(async () => {
    await setTarget(actor, { memberId, targetCents });
    return `Target set to ${money(targetCents)}.`;
  }, { target });
}