"use client";

import { useActionState, useOptimistic, startTransition } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import type { UpdateVotes } from "@/server/update-votes"; // type only, erased from the browser bundle
import { voteUpdateAction } from "./vote-actions";

/*
  Up and down votes under an update. Taps feel instant (optimistic), then
  the server result replaces the guess. Tapping your current vote removes it.
  "See who voted" lists names on each side: votes here are public by design.
*/

function apply(v: UpdateVotes, next: 1 | -1 | 0, me: string): UpdateVotes {
  const up = v.upNames.filter((n) => n !== me);
  const down = v.downNames.filter((n) => n !== me);
  if (next === 1) up.push(me);
  if (next === -1) down.push(me);
  return { up: up.length, down: down.length, mine: next, upNames: up, downNames: down };
}

function Names({ names }: { names: string[] }) {
  return names.length ? <span className="capitalize">{names.join(", ")}</span> : <span className="text-muted">No one yet</span>;
}

export function VoteButtons({ updateId, votes, myName }: { updateId: string; votes: UpdateVotes; myName: string }) {
  const [shown, setShown] = useOptimistic(votes, (v, next: 1 | -1 | 0) => apply(v, next, myName));
  const [state, action, pending] = useActionState(voteUpdateAction, null);

  function vote(value: 1 | -1) {
    const next = shown.mine === value ? 0 : value;
    const form = new FormData();
    form.set("updateId", updateId);
    form.set("value", String(next));
    startTransition(() => {
      setShown(next);
      action(form);
    });
  }

  const base =
    "inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition-colors disabled:opacity-60";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => vote(1)}
          disabled={pending}
          aria-pressed={shown.mine === 1}
          aria-label={`Upvote. ${shown.up} ${shown.up === 1 ? "upvote" : "upvotes"}`}
          className={`${base} ${
            shown.mine === 1 ? "border-success/40 bg-success-tint text-success" : "border-line bg-panel text-ink hover:bg-brand-tint"
          }`}
        >
          <ThumbsUp size={15} className={shown.mine === 1 ? "fill-current" : ""} aria-hidden="true" />
          <span className="figures">{shown.up}</span>
        </button>
        <button
          type="button"
          onClick={() => vote(-1)}
          disabled={pending}
          aria-pressed={shown.mine === -1}
          aria-label={`Downvote. ${shown.down} ${shown.down === 1 ? "downvote" : "downvotes"}`}
          className={`${base} ${
            shown.mine === -1 ? "border-danger/40 bg-danger-tint text-danger" : "border-line bg-panel text-ink hover:bg-brand-tint"
          }`}
        >
          <ThumbsDown size={15} className={shown.mine === -1 ? "fill-current" : ""} aria-hidden="true" />
          <span className="figures">{shown.down}</span>
        </button>

        {shown.up + shown.down > 0 && (
          <details className="group open:basis-full">
            <summary className="inline-flex cursor-pointer list-none text-[12px] font-medium text-brand hover:underline [&::-webkit-details-marker]:hidden">
              See who voted
            </summary>
            <div className="mt-2 flex flex-col gap-1 text-[13px]">
              <p className="flex gap-1.5">
                <ThumbsUp size={14} className="mt-0.5 shrink-0 text-success" aria-label="Upvoted by" />
                <Names names={shown.upNames} />
              </p>
              <p className="flex gap-1.5">
                <ThumbsDown size={14} className="mt-0.5 shrink-0 text-danger" aria-label="Downvoted by" />
                <Names names={shown.downNames} />
              </p>
            </div>
          </details>
        )}
      </div>
      {state && !state.ok && <p className="text-[12px] text-danger" role="alert">{state.message}</p>}
    </div>
  );
}
