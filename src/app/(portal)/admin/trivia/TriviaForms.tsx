"use client";

import { useActionState } from "react";
import { Layers, Pencil, Power, Trash2 } from "lucide-react";
import { Alert, Button, Field } from "@/components/ui/Form";
import { Panel } from "@/components/ui/Panel";
import {
  createCardAction,
  deleteCardAction,
  editCardAction,
  toggleCardAction,
  type TriviaActionResult,
} from "./actions";

/* Organizer forms for Praetorian Trivia cards. The server validates everything again. */

type Values = { question: string; answer: string };

/* React 19 resets a form after its action runs. Bumping a key on every
   submit remounts the fields so they show what was typed after an error. */
function useCountedAction(action: (prev: TriviaActionResult, form: FormData) => Promise<TriviaActionResult>) {
  return useActionState(
    async (prev: { result: TriviaActionResult; n: number } | null, form: FormData) => ({
      result: await action(null, form),
      n: (prev?.n ?? 0) + 1,
    }),
    null,
  );
}

function CardFields({ idPrefix, values }: { idPrefix: string; values?: Values }) {
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${idPrefix}-question`} className="text-[14px] font-medium">Question</label>
        <textarea
          id={`${idPrefix}-question`}
          name="question"
          rows={3}
          maxLength={280}
          required
          defaultValue={values?.question}
          placeholder="Who held the record for most spoken languages?"
          className="rounded-control border border-muted/30 bg-page px-3.5 py-3 text-base leading-relaxed text-ink outline-none transition-colors placeholder:text-muted/70 focus:border-brand focus:bg-panel sm:text-[15px]"
        />
      </div>
      <Field
        id={`${idPrefix}-answer`}
        name="answer"
        label="Answer"
        maxLength={160}
        autoComplete="off"
        placeholder="Shown only when the player taps Reveal"
        defaultValue={values?.answer}
        required
      />
    </>
  );
}

export function NewCardForm() {
  const [counted, action, pending] = useCountedAction(createCardAction);
  const state = counted?.result ?? null;
  const values = state && !state.ok ? state.values : undefined;

  return (
    <Panel className="p-6" labelledBy="new-card-heading">
      <h2 id="new-card-heading" className="flex items-center gap-2 font-serif text-[22px] font-semibold">
        <Layers size={19} className="text-brand" aria-hidden="true" /> Add a card
      </h2>
      <form key={counted?.n ?? 0} action={action} className="mt-5 flex flex-col gap-4">
        <CardFields idPrefix="new" values={values} />
        <div>
          <Button type="submit" disabled={pending}>{pending ? "Adding..." : "Add card"}</Button>
        </div>
      </form>
      {state?.message && (
        <div className="mt-4"><Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert></div>
      )}
    </Panel>
  );
}

export function EditCardForm({ card }: { card: { id: string; question: string; answer: string } }) {
  const [counted, action, pending] = useCountedAction(editCardAction);
  const state = counted?.result ?? null;
  const values: Values =
    state && !state.ok && state.values ? state.values : { question: card.question, answer: card.answer };

  return (
    <details>
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-[13px] font-medium text-brand hover:underline [&::-webkit-details-marker]:hidden">
        <Pencil size={13} aria-hidden="true" /> Edit
      </summary>
      <form key={counted?.n ?? 0} action={action} className="mt-3 flex flex-col gap-4 rounded-control border border-line bg-panel p-4">
        <input type="hidden" name="id" value={card.id} />
        <CardFields idPrefix={`edit-${card.id}`} values={values} />
        <div>
          <Button type="submit" disabled={pending} className="h-10 px-4 text-[13px]">{pending ? "Saving..." : "Save changes"}</Button>
        </div>
        {state?.message && <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert>}
      </form>
    </details>
  );
}

/* Switching off keeps the card (and its history) but takes it out of the deck. */
export function ToggleCardForm({ id, active }: { id: string; active: boolean }) {
  const [state, action, pending] = useActionState(toggleCardAction, null);
  return (
    <form action={action} className="inline-flex flex-col">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="active" value={active ? "false" : "true"} />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-1 text-[13px] font-medium text-muted hover:text-ink hover:underline disabled:opacity-60"
      >
        <Power size={13} aria-hidden="true" /> {pending ? "Saving..." : active ? "Switch off" : "Switch on"}
      </button>
      {state && !state.ok && <p className="mt-1 text-[12px] text-danger" role="alert">{state.message}</p>}
    </form>
  );
}

/* Two steps: open the disclosure, then confirm. Never one stray click. */
export function DeleteCardForm({ id, question }: { id: string; question: string }) {
  const [state, action, pending] = useActionState(deleteCardAction, null);
  return (
    <details>
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-[13px] font-medium text-danger hover:underline [&::-webkit-details-marker]:hidden">
        <Trash2 size={13} aria-hidden="true" /> Delete
      </summary>
      <form action={action} className="mt-3 flex flex-col gap-2 rounded-control border border-danger/25 bg-danger-tint p-4">
        <input type="hidden" name="id" value={id} />
        <p className="text-[13px] text-ink">
          Delete &ldquo;{question}&rdquo; for good? To keep it for another night, switch it off instead. The deletion is logged.
        </p>
        <div>
          <Button type="submit" variant="danger" disabled={pending} className="h-9 px-3 text-[13px]">
            {pending ? "Deleting..." : "Yes, delete it"}
          </Button>
        </div>
        {state && !state.ok && <p className="text-[12px] text-danger" role="alert">{state.message}</p>}
      </form>
    </details>
  );
}
