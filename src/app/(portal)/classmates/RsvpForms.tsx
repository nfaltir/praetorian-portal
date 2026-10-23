"use client";

import { useActionState, useState } from "react";
import { Pencil } from "lucide-react";
import { Alert, Button } from "@/components/ui/Form";
import type { RsvpEntry, RsvpStatus } from "@/server/rsvp"; // types only, erased from the browser bundle
import { clearRsvpAction, setRsvpAction } from "./actions";

/*
  Organizer-only RSVP editor, one per classmate row. The page renders it
  only for staff, and the actions re-check the role on the server.
*/

const STATUS_LABELS: Record<RsvpStatus, string> = {
  attending: "Attending",
  maybe: "Maybe",
  not_attending: "Not attending",
};

const inputClass =
  "h-11 rounded-control border border-muted/30 bg-page px-3.5 text-base text-ink outline-none transition-colors placeholder:text-muted/70 hover:border-muted/50 focus:border-brand focus:bg-panel sm:text-[15px]";

export function EditRsvpForm({ entry, maxGuests }: { entry: RsvpEntry; maxGuests: number }) {
  const [state, action, pending] = useActionState(setRsvpAction, null);
  const [status, setStatus] = useState<RsvpStatus | null>(entry.status);
  const id = `rsvp-${entry.userId}`;

  return (
    <details className="group">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-[13px] font-medium text-brand hover:underline [&::-webkit-details-marker]:hidden">
        <Pencil size={13} aria-hidden="true" /> {entry.status ? "Edit RSVP" : "Record RSVP"}
      </summary>

      <form action={action} className="mt-3 flex flex-col gap-4 rounded-control border border-line bg-page p-4">
        <input type="hidden" name="userId" value={entry.userId} />

        <fieldset>
          <legend className="mb-2 text-[14px] font-medium">Response for {entry.name}</legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {(Object.keys(STATUS_LABELS) as RsvpStatus[]).map((s) => (
              <label
                key={s}
                className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-control border border-line bg-panel px-3.5 text-[14px] has-checked:border-brand has-checked:bg-brand-tint"
              >
                <input
                  type="radio"
                  name="status"
                  value={s}
                  checked={status === s}
                  onChange={() => setStatus(s)}
                  required
                  className="accent-(--brand)"
                />
                {STATUS_LABELS[s]}
              </label>
            ))}
          </div>
        </fieldset>

        {status === "attending" && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[120px_1fr]">
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${id}-guests`} className="text-[14px] font-medium">Guests</label>
              <select id={`${id}-guests`} name="guests" defaultValue={String(entry.guests)} className={inputClass}>
                {Array.from({ length: maxGuests + 1 }, (_, n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${id}-bringing`} className="text-[14px] font-medium">Bringing (optional)</label>
              <input
                id={`${id}-bringing`}
                name="bringing"
                maxLength={80}
                autoComplete="off"
                placeholder="Famous apple pie"
                defaultValue={entry.bringing ?? ""}
                className={inputClass}
              />
            </div>
          </div>
        )}

        <div>
          <Button type="submit" disabled={pending || !status} className="h-10 px-4 text-[13px]">
            {pending ? "Saving..." : "Save RSVP"}
          </Button>
        </div>
        {state?.message && <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert>}
      </form>

      {entry.status && <ClearRsvpForm userId={entry.userId} name={entry.name} />}
    </details>
  );
}

/* Back to "not replied". Asks first so it's never one stray click. */
function ClearRsvpForm({ userId, name }: { userId: string; name: string }) {
  const [state, action, pending] = useActionState(clearRsvpAction, null);
  return (
    <form action={action} className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]">
      <input type="hidden" name="userId" value={userId} />
      <span className="text-muted">Recorded for the wrong person?</span>
      <button
        type="submit"
        disabled={pending}
        onClick={(e) => {
          if (!window.confirm(`Clear ${name}'s RSVP? They'll show as not replied.`)) e.preventDefault();
        }}
        className="font-medium text-danger hover:underline disabled:opacity-60"
      >
        {pending ? "Clearing..." : "Clear RSVP"}
      </button>
      {state && !state.ok && <span className="text-danger" role="alert">{state.message}</span>}
    </form>
  );
}
