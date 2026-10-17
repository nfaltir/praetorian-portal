"use client";

import { useActionState } from "react";
import { PlusCircle, Undo2 } from "lucide-react";
import { Alert, Button, Field } from "@/components/ui/Form";
import { Panel } from "@/components/ui/Panel";
import {
  recordPaymentAction,
  reverseEntryAction,
  setTargetAction,
  type LedgerActionResult,
} from "./actions";

/*
  Treasurer forms. All submit through server actions (POST), never a
  URL, so amounts and notes can't end up in browser history or logs.
*/

function Result({ state }: { state: LedgerActionResult }) {
  if (!state?.message) return null;
  return <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert>;
}

export function RecordPaymentForm({
  members,
  today,
}: {
  members: { id: string; name: string }[];
  today: string;
}) {
  /*
    Each submit bumps a counter that remounts the form. React 19 resets
    forms after an action, which would snap the classmate dropdown back to
    "Choose a classmate" after an error; remounting restores every field
    from the values the server echoed back (or clears them after success).
  */
  const [counted, action, pending] = useActionState(
    async (prev: { result: LedgerActionResult; n: number } | null, form: FormData) => ({
      result: await recordPaymentAction(null, form),
      n: (prev?.n ?? 0) + 1,
    }),
    null,
  );
  const state = counted?.result ?? null;
  const v = state && !state.ok ? state.values : undefined;

  return (
    <Panel className="p-6" labelledBy="record-heading">
      <h2 id="record-heading" className="flex items-center gap-2 font-serif text-[22px] font-semibold">
        <PlusCircle size={20} className="text-brand" aria-hidden="true" /> Record a payment
      </h2>
      <p className="mt-1 text-[14px] text-muted">
        One entry per deposit on the bank statement. It counts immediately and shows on the dashboard.
      </p>

      <form key={counted?.n ?? 0} action={action} className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label htmlFor="pay-member" className="text-[14px] font-medium">Classmate</label>
          <select
            id="pay-member"
            name="memberId"
            required
            defaultValue={v?.memberId ?? ""}
            className="h-11 rounded-control border border-line bg-panel px-3 text-[15px]"
          >
            <option value="" disabled>Choose a classmate</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
        <Field
          id="pay-amount"
          name="amount"
          label="Amount (USD)"
          inputMode="decimal"
          placeholder="50.00"
          autoComplete="off"
          defaultValue={v?.amount}
          required
        />
        <Field
          id="pay-date"
          name="paidOn"
          type="date"
          label="Date on bank statement"
          max={today}
          defaultValue={v?.paidOn ?? today}
          required
        />
        <div className="sm:col-span-2">
          <Field
            id="pay-memo"
            name="memo"
            label="Note (optional)"
            hint="e.g. bank reference, or 'paid by parents'. Visible to treasurers only."
            maxLength={200}
            autoComplete="off"
            defaultValue={v?.memo}
          />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={pending}>{pending ? "Recording..." : "Record payment"}</Button>
        </div>
      </form>
      <div className="mt-4"><Result state={state} /></div>
    </Panel>
  );
}

/* Compact disclosure: a reason is required, so a reversal is never one stray click */
export function ReverseEntryForm({ entryId, summary }: { entryId: string; summary: string }) {
  const [state, action, pending] = useActionState(reverseEntryAction, null);

  if (state?.ok) return <p className="text-[12px] text-success" role="status">Reversed</p>;

  return (
    <details className="group">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-[12px] font-medium text-danger hover:underline [&::-webkit-details-marker]:hidden">
        <Undo2 size={12} aria-hidden="true" /> Reverse
      </summary>
      <form action={action} className="mt-2 flex w-64 flex-col gap-2">
        <input type="hidden" name="entryId" value={entryId} />
        <label htmlFor={`reason-${entryId}`} className="text-[12px] text-muted">
          Reverse {summary}. Why?
        </label>
        <input
          id={`reason-${entryId}`}
          name="reason"
          required
          minLength={3}
          maxLength={200}
          defaultValue={state?.values?.reason}
          placeholder="e.g. recorded under the wrong name"
          className="h-9 rounded-control border border-line bg-panel px-2.5 text-[13px]"
        />
        <Button type="submit" variant="danger" disabled={pending} className="h-9 px-3 text-[13px]">
          {pending ? "Reversing..." : "Confirm reversal"}
        </Button>
        {state && !state.ok && <p className="text-[12px] text-danger" role="alert">{state.message}</p>}
      </form>
    </details>
  );
}

export function TargetForm({ memberId, memberName, targetDollars }: { memberId: string; memberName: string; targetDollars: string }) {
  const [state, action, pending] = useActionState(setTargetAction, null);

  return (
    <form action={action} className="flex items-center gap-1.5">
      <input type="hidden" name="memberId" value={memberId} />
      <label htmlFor={`target-${memberId}`} className="sr-only">Target for {memberName}</label>
      <span className="text-[13px] text-muted" aria-hidden="true">$</span>
      <input
        id={`target-${memberId}`}
        name="target"
        inputMode="decimal"
        defaultValue={state?.values?.target ?? targetDollars}
        className="figures h-8 w-20 rounded-control border border-line bg-panel px-2 text-right text-[13px]"
      />
      <Button type="submit" variant="secondary" disabled={pending} className="h-8 px-2.5 text-[12px]">Save</Button>
      {state?.message && (
        <span className={`text-[12px] ${state.ok ? "text-success" : "text-danger"}`} role={state.ok ? "status" : "alert"}>
          {state.ok ? "Saved" : state.message}
        </span>
      )}
    </form>
  );
}