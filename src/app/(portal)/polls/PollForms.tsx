"use client";

import { useActionState, useState } from "react";
import { Check, Lock, Plus, Trash2, Vote, X } from "lucide-react";
import { Alert, Button, Field } from "@/components/ui/Form";
import { Panel } from "@/components/ui/Panel";
import type { PollView } from "@/server/polls"; // type only, erased from the browser bundle
import {
  closePollAction,
  createPollAction,
  deletePollAction,
  voteAction,
  type PollActionResult,
} from "./actions";

/*
  Poll forms. All submit through server actions (POST); the server
  re-checks permissions and validates everything again.
*/

const MAX_CHOICES = 10;

/* React 19 resets a form after its action runs. Bumping a key on every
   submit remounts the fields so they show the right values: what was
   typed (after an error) or blank (after success). */
function useCountedAction(action: (prev: PollActionResult, form: FormData) => Promise<PollActionResult>) {
  return useActionState(
    async (prev: { result: PollActionResult; n: number } | null, form: FormData) => ({
      result: await action(null, form),
      n: (prev?.n ?? 0) + 1,
    }),
    null,
  );
}

/* ---------- Organizer: new poll ---------- */

function ChoiceInputs({ initial }: { initial: string[] }) {
  const [choices, setChoices] = useState(() =>
    (initial.length >= 2 ? initial : [...initial, "", ""].slice(0, Math.max(2, initial.length))).map((value, i) => ({ key: i, value })),
  );
  const [nextKey, setNextKey] = useState(choices.length);

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1.5 text-[14px] font-medium">Choices</legend>
      {choices.map((c, i) => (
        <div key={c.key} className="flex items-center gap-2">
          <input
            name="option"
            aria-label={`Choice ${i + 1}`}
            placeholder={`Choice ${i + 1}`}
            maxLength={120}
            autoComplete="off"
            value={c.value}
            onChange={(e) => setChoices((list) => list.map((x) => (x.key === c.key ? { ...x, value: e.target.value } : x)))}
            className="h-11 min-w-0 flex-1 rounded-control border border-muted/30 bg-page px-3.5 text-base text-ink outline-none transition-colors placeholder:text-muted/70 hover:border-muted/50 focus:border-brand focus:bg-panel sm:text-[15px]"
          />
          {choices.length > 2 && (
            <button
              type="button"
              onClick={() => setChoices((list) => list.filter((x) => x.key !== c.key))}
              className="grid size-11 shrink-0 place-items-center rounded-control text-muted hover:bg-danger-tint hover:text-danger"
              aria-label={`Remove choice ${i + 1}`}
            >
              <X size={17} aria-hidden="true" />
            </button>
          )}
        </div>
      ))}
      {choices.length < MAX_CHOICES && (
        <button
          type="button"
          onClick={() => {
            setChoices((list) => [...list, { key: nextKey, value: "" }]);
            setNextKey((k) => k + 1);
          }}
          className="inline-flex h-9 items-center gap-1.5 self-start text-[13px] font-medium text-brand hover:underline"
        >
          <Plus size={15} aria-hidden="true" /> Add a choice
        </button>
      )}
    </fieldset>
  );
}

export function NewPollForm({ timeZoneLabel }: { timeZoneLabel: string }) {
  const [counted, action, pending] = useCountedAction(createPollAction);
  const state = counted?.result ?? null;
  const values = state && !state.ok ? state.values : undefined;

  return (
    <Panel className="p-6" labelledBy="new-poll-heading">
      <h2 id="new-poll-heading" className="flex items-center gap-2 font-serif text-[22px] font-semibold">
        <Vote size={19} className="text-brand" aria-hidden="true" /> Start a poll
      </h2>
      <form key={counted?.n ?? 0} action={action} className="mt-5 flex flex-col gap-4">
        <Field id="poll-question" name="question" label="Question" maxLength={200} autoComplete="off" defaultValue={values?.question} required />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="poll-details" className="text-[14px] font-medium">Details (optional)</label>
          <textarea
            id="poll-details"
            name="details"
            rows={3}
            maxLength={1000}
            defaultValue={values?.details}
            className="rounded-control border border-muted/30 bg-page px-3.5 py-3 text-base leading-relaxed text-ink outline-none transition-colors focus:border-brand focus:bg-panel sm:text-[15px]"
          />
        </div>
        <ChoiceInputs initial={values?.options ?? ["", ""]} />
        <Field
          id="poll-closes"
          name="closesAt"
          type="datetime-local"
          label={`Closes (${timeZoneLabel})`}
          hint="Results always show to everyone once the poll closes."
          defaultValue={values?.closesAt}
          required
        />
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-[14px] font-medium">Who sees results while it&apos;s open</legend>
          {[
            { value: "after_vote", label: "Classmates who have voted", hint: "Good for casual questions." },
            { value: "after_close", label: "Nobody until it closes", hint: "Avoids people following the crowd. Best for decisions." },
          ].map((o) => (
            <label key={o.value} className="flex cursor-pointer gap-3 rounded-control border border-line bg-panel px-3.5 py-3 has-checked:border-brand has-checked:bg-brand-tint">
              <input
                type="radio"
                name="showResults"
                value={o.value}
                defaultChecked={(values?.showResults ?? "after_vote") === o.value}
                className="mt-1 accent-(--brand)"
              />
              <span>
                <span className="block text-[14px] font-medium">{o.label}</span>
                <span className="block text-[12px] text-muted">{o.hint}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <div>
          <Button type="submit" disabled={pending}>{pending ? "Posting..." : "Post poll"}</Button>
        </div>
      </form>
      {state?.message && (
        <div className="mt-4"><Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert></div>
      )}
    </Panel>
  );
}

/* ---------- Classmate: vote and results ---------- */

function Results({ poll }: { poll: PollView }) {
  const total = poll.options.reduce((s, o) => s + (o.votes ?? 0), 0);
  const top = Math.max(0, ...poll.options.map((o) => o.votes ?? 0));
  return (
    <ul className="flex flex-col gap-3">
      {poll.options.map((o) => {
        const votes = o.votes ?? 0;
        const pct = total ? Math.round((votes / total) * 100) : 0;
        const mine = o.id === poll.myOptionId;
        const leading = poll.closed && votes > 0 && votes === top;
        return (
          <li key={o.id}>
            <div className="flex items-baseline justify-between gap-3 text-[14px]">
              <span className={`flex min-w-0 items-center gap-1.5 ${leading ? "font-semibold" : ""}`}>
                <span className="truncate">{o.label}</span>
                {mine && (
                  <span className="inline-flex shrink-0 items-center gap-0.5 text-[12px] font-medium text-brand">
                    <Check size={13} aria-hidden="true" /> your vote
                  </span>
                )}
              </span>
              <span className="figures shrink-0 text-muted">
                {pct}% <span className="text-[12px]">({votes})</span>
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-line" aria-hidden="true">
              <div className={`h-full rounded-full ${mine ? "bg-brand" : "bg-brand-soft"}`} style={{ width: `${pct}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Ballot({ poll, onDone }: { poll: PollView; onDone?: () => void }) {
  const [state, action, pending] = useActionState(async (prev: PollActionResult, form: FormData) => {
    const r = await voteAction(prev, form);
    if (r?.ok) onDone?.();
    return r;
  }, null);

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="pollId" value={poll.id} />
      <fieldset className="flex flex-col gap-2">
        <legend className="sr-only">{poll.question}</legend>
        {poll.options.map((o) => (
          <label
            key={o.id}
            className="flex min-h-11 cursor-pointer items-center gap-3 rounded-control border border-line bg-panel px-3.5 py-2.5 text-[15px] has-checked:border-brand has-checked:bg-brand-tint"
          >
            <input type="radio" name="optionId" value={o.id} defaultChecked={o.id === poll.myOptionId} required className="accent-(--brand)" />
            <span>{o.label}</span>
          </label>
        ))}
      </fieldset>
      <div className="mt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : poll.myOptionId ? "Change my vote" : "Vote"}
        </Button>
      </div>
      {state && !state.ok && <Alert tone="error">{state.message}</Alert>}
    </form>
  );
}

export function PollBody({ poll }: { poll: PollView }) {
  const [changing, setChanging] = useState(false);
  const voted = poll.myOptionId !== null;
  const myLabel = poll.options.find((o) => o.id === poll.myOptionId)?.label;

  if (poll.closed) return <Results poll={poll} />;
  if (!voted || changing) return <Ballot poll={poll} onDone={() => setChanging(false)} />;

  return (
    <div className="flex flex-col gap-4">
      {poll.resultsVisible ? (
        <Results poll={poll} />
      ) : (
        <p className="flex items-start gap-2 rounded-control bg-brand-tint px-3.5 py-3 text-[14px]">
          <Lock size={16} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" />
          <span>
            You voted <strong className="font-semibold">{myLabel}</strong>. Results show when the poll closes.
          </span>
        </p>
      )}
      <button type="button" onClick={() => setChanging(true)} className="self-start text-[13px] font-medium text-brand hover:underline">
        Change my vote
      </button>
    </div>
  );
}

/* ---------- Organizer: close and delete ---------- */

export function ClosePollForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(closePollAction, null);
  return (
    <details>
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-[13px] font-medium text-brand hover:underline [&::-webkit-details-marker]:hidden">
        <Lock size={13} aria-hidden="true" /> Close now
      </summary>
      <form action={action} className="mt-3 flex flex-col gap-2 rounded-control border border-line bg-page p-4">
        <input type="hidden" name="id" value={id} />
        <p className="text-[13px]">Close this poll now? Voting stops and everyone can see the results. This can&apos;t be undone.</p>
        <div>
          <Button type="submit" variant="secondary" disabled={pending} className="h-9 px-3 text-[13px]">
            {pending ? "Closing..." : "Yes, close it"}
          </Button>
        </div>
        {state && !state.ok && <p className="text-[12px] text-danger" role="alert">{state.message}</p>}
      </form>
    </details>
  );
}

/* Two steps: open the disclosure, then confirm. Never one stray click. */
export function DeletePollForm({ id, question, votes }: { id: string; question: string; votes: number }) {
  const [state, action, pending] = useActionState(deletePollAction, null);
  return (
    <details>
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-[13px] font-medium text-danger hover:underline [&::-webkit-details-marker]:hidden">
        <Trash2 size={13} aria-hidden="true" /> Delete
      </summary>
      <form action={action} className="mt-3 flex flex-col gap-2 rounded-control border border-danger/25 bg-danger-tint p-4">
        <input type="hidden" name="id" value={id} />
        <p className="text-[13px] text-ink">
          Delete &ldquo;{question}&rdquo;{votes > 0 ? ` and its ${votes} vote${votes === 1 ? "" : "s"}` : ""}? The deletion is logged.
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
