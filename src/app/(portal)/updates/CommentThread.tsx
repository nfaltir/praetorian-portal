"use client";

import { useActionState, useState } from "react";
import { MessageCircle, Pencil, Trash2 } from "lucide-react";
import { initials, relativeTime } from "@/lib/format";
import type { CommentView } from "@/server/update-comments"; // type only, erased from the browser bundle
import {
  deleteCommentAction,
  editCommentAction,
  postCommentAction,
  removeCommentAction,
  type CommentResult,
} from "./comment-actions";

/*
  Comment thread under an update. Plain text only: React renders it as text
  and links are deliberately not turned into clickable anchors.
  Times are computed against the server's "now" (passed in) so the server
  and browser render the same words.
*/

const SHOW_LATEST = 5;

const textareaClass =
  "w-full rounded-control border border-muted/30 bg-page px-3.5 py-2.5 text-base leading-relaxed text-ink outline-none transition-colors placeholder:text-muted/70 focus:border-brand focus:bg-panel sm:text-[14px]";

/* React 19 resets a form after its action; a counter key remounts it so the
   box is cleared after success but keeps the text after an error */
function useCounted(action: (p: CommentResult, f: FormData) => Promise<CommentResult>) {
  return useActionState(
    async (prev: { result: CommentResult; n: number } | null, form: FormData) => ({
      result: await action(null, form),
      n: (prev?.n ?? 0) + 1,
    }),
    null,
  );
}

function NewComment({ updateId }: { updateId: string }) {
  const [counted, action, pending] = useCounted(postCommentAction);
  const state = counted?.result ?? null;
  return (
    <form key={counted?.n ?? 0} action={action} className="flex flex-col gap-2">
      <input type="hidden" name="updateId" value={updateId} />
      <label htmlFor={`c-new-${updateId}`} className="sr-only">Write a comment</label>
      <textarea
        id={`c-new-${updateId}`}
        name="body"
        rows={2}
        maxLength={1000}
        required
        placeholder="Write a comment..."
        defaultValue={state && !state.ok ? state.body : undefined}
        className={textareaClass}
      />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-9 items-center rounded-control bg-brand px-4 text-[13px] font-medium text-on-dark transition-colors hover:bg-brand-ink disabled:opacity-60"
        >
          {pending ? "Posting..." : "Post"}
        </button>
        {state && !state.ok && <p className="text-[12px] text-danger" role="alert">{state.message}</p>}
      </div>
    </form>
  );
}

function EditComment({ comment, onDone }: { comment: CommentView; onDone: () => void }) {
  const [state, action, pending] = useActionState(async (prev: CommentResult, form: FormData) => {
    const r = await editCommentAction(prev, form);
    if (r?.ok) onDone();
    return r;
  }, null);
  return (
    <form action={action} className="mt-1.5 flex flex-col gap-2">
      <input type="hidden" name="id" value={comment.id} />
      <label htmlFor={`c-edit-${comment.id}`} className="sr-only">Edit your comment</label>
      <textarea
        id={`c-edit-${comment.id}`}
        name="body"
        rows={3}
        maxLength={1000}
        required
        defaultValue={state && !state.ok ? state.body : comment.body}
        className={textareaClass}
      />
      <div className="flex flex-wrap items-center gap-3 text-[13px]">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-8 items-center rounded-control bg-brand px-3 font-medium text-on-dark hover:bg-brand-ink disabled:opacity-60"
        >
          {pending ? "Saving..." : "Save"}
        </button>
        <button type="button" onClick={onDone} className="font-medium text-muted hover:underline">
          Cancel
        </button>
        {state && !state.ok && <span className="text-[12px] text-danger" role="alert">{state.message}</span>}
      </div>
    </form>
  );
}

/* Delete (own) or Remove (organizer). Asks first: one stray tap never deletes. */
function DeleteButton({ id, mode }: { id: string; mode: "own" | "moderate" }) {
  const [state, action, pending] = useActionState(mode === "own" ? deleteCommentAction : removeCommentAction, null);
  const label = mode === "own" ? "Delete" : "Remove";
  const confirmText =
    mode === "own"
      ? "Delete your comment? This can't be undone."
      : "Remove this comment? It will show as removed by an organizer, and the removal is logged.";
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(confirmText)) e.preventDefault();
      }}
      className="inline"
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" disabled={pending} className="inline-flex items-center gap-1 font-medium text-danger hover:underline disabled:opacity-60">
        <Trash2 size={12} aria-hidden="true" /> {pending ? `${label}...` : label}
      </button>
      {state && !state.ok && <span className="ml-2 text-danger" role="alert">{state.message}</span>}
    </form>
  );
}

function Comment({
  comment: c,
  viewerId,
  isOrganizer,
  now,
}: {
  comment: CommentView;
  viewerId: string;
  isOrganizer: boolean;
  now: Date;
}) {
  const [editing, setEditing] = useState(false);
  const mine = c.authorId === viewerId;

  return (
    <li className="flex gap-3 py-3">
      <span
        className="grid size-8 shrink-0 place-items-center rounded-full bg-linear-to-br from-teal-100 to-lime-100 text-[11px] font-semibold text-brand-ink"
        aria-hidden="true"
      >
        {initials(c.authorName)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-x-2 text-[13px]">
          <span className="font-medium capitalize text-ink">{c.authorName}</span>
          <time dateTime={c.createdAt} className="text-muted">{relativeTime(c.createdAt, now)}</time>
          {c.editedAt && !c.removed && <span className="text-muted">· edited</span>}
        </p>

        {c.removed ? (
          <p className="mt-0.5 text-[14px] text-muted italic">Comment removed by an organizer</p>
        ) : editing ? (
          <EditComment comment={c} onDone={() => setEditing(false)} />
        ) : (
          <p className="mt-0.5 text-[14px] leading-relaxed break-words whitespace-pre-line text-ink">{c.body}</p>
        )}

        {!c.removed && !editing && (mine || isOrganizer) && (
          <div className="mt-1 flex flex-wrap gap-x-4 text-[12px]">
            {mine && (
              <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-1 font-medium text-brand hover:underline">
                <Pencil size={12} aria-hidden="true" /> Edit
              </button>
            )}
            {mine ? <DeleteButton id={c.id} mode="own" /> : <DeleteButton id={c.id} mode="moderate" />}
          </div>
        )}
      </div>
    </li>
  );
}

export function CommentThread({
  updateId,
  comments,
  viewerId,
  isOrganizer,
  nowIso,
}: {
  updateId: string;
  comments: CommentView[];
  viewerId: string;
  isOrganizer: boolean;
  nowIso: string;
}) {
  const [showAll, setShowAll] = useState(false);
  const now = new Date(nowIso);
  const live = comments.filter((c) => !c.removed).length;
  const hidden = showAll ? 0 : Math.max(0, comments.length - SHOW_LATEST);
  const visible = comments.slice(hidden);

  return (
    <details className="group">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-[13px] font-medium text-brand hover:underline [&::-webkit-details-marker]:hidden">
        <MessageCircle size={15} aria-hidden="true" />
        {live === 0 ? "Add a comment" : `${live} ${live === 1 ? "comment" : "comments"}`}
      </summary>

      <div className="mt-2 border-t border-line">
        {hidden > 0 && (
          <button type="button" onClick={() => setShowAll(true)} className="mt-3 text-[12px] font-medium text-brand hover:underline">
            Show {hidden} earlier {hidden === 1 ? "comment" : "comments"}
          </button>
        )}
        {visible.length > 0 && (
          <ul className="divide-y divide-line">
            {visible.map((c) => (
              <Comment key={`${c.id}-${c.editedAt ?? ""}-${c.removed}`} comment={c} viewerId={viewerId} isOrganizer={isOrganizer} now={now} />
            ))}
          </ul>
        )}
        <div className="pt-3">
          <NewComment updateId={updateId} />
        </div>
      </div>
    </details>
  );
}
