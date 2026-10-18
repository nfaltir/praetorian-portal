"use client";

import { useActionState } from "react";
import { CheckCircle2, RotateCcw, Send } from "lucide-react";
import { Alert, Button, Field } from "@/components/ui/Form";
import { replyAction, setClosedAction, startThreadAction, type MessageActionResult } from "./actions";

/*
  Message forms. All submit through server actions (POST).
  React 19 resets a form after its action; bumping a key per submit
  remounts the fields so they show what was typed after an error, or
  come back empty after a successful send.
*/

function useCountedAction(action: (prev: MessageActionResult, form: FormData) => Promise<MessageActionResult>) {
  return useActionState(
    async (prev: { result: MessageActionResult; n: number } | null, form: FormData) => ({
      result: await action(null, form),
      n: (prev?.n ?? 0) + 1,
    }),
    null,
  );
}

const textareaClass =
  "rounded-control border border-line bg-panel px-3.5 py-3 text-[15px] leading-relaxed text-ink outline-none transition-colors focus:border-brand";

export function NewThreadForm() {
  const [counted, action, pending] = useCountedAction(startThreadAction);
  const state = counted?.result ?? null;
  const v = state && !state.ok ? state.values : undefined;

  return (
    <form key={counted?.n ?? 0} action={action} className="flex flex-col gap-4">
      <Field
        id="msg-subject"
        name="subject"
        label="Subject"
        maxLength={120}
        autoComplete="off"
        placeholder="e.g. Question about my contribution"
        defaultValue={v?.subject}
        required
      />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="msg-body" className="text-[14px] font-medium">Message</label>
        <textarea
          id="msg-body"
          name="body"
          rows={6}
          maxLength={4000}
          defaultValue={v?.body}
          required
          aria-describedby="msg-body-hint"
          className={textareaClass}
        />
        <p id="msg-body-hint" className="text-[12px] text-muted">
          Goes to the organizers only. Other classmates can&apos;t see it.
        </p>
      </div>
      <div>
        <Button type="submit" disabled={pending}>
          <Send size={16} aria-hidden="true" /> {pending ? "Sending..." : "Send to organizers"}
        </Button>
      </div>
      {state && !state.ok && <Alert tone="error">{state.message}</Alert>}
    </form>
  );
}

export function ReplyForm({ threadId, closed }: { threadId: string; closed: boolean }) {
  const [counted, action, pending] = useCountedAction(replyAction);
  const state = counted?.result ?? null;
  const v = state && !state.ok ? state.values : undefined;

  return (
    <form key={counted?.n ?? 0} action={action} className="flex flex-col gap-3">
      <input type="hidden" name="threadId" value={threadId} />
      <label htmlFor="reply-body" className="text-[14px] font-medium">Reply</label>
      <textarea
        id="reply-body"
        name="body"
        rows={4}
        maxLength={4000}
        defaultValue={v?.body}
        required
        className={textareaClass}
      />
      {closed && (
        <p className="text-[12px] text-muted">This conversation is resolved. Replying reopens it.</p>
      )}
      <div>
        <Button type="submit" disabled={pending}>
          <Send size={16} aria-hidden="true" /> {pending ? "Sending..." : "Send reply"}
        </Button>
      </div>
      {state && !state.ok && <Alert tone="error">{state.message}</Alert>}
    </form>
  );
}

/* Organizers only (the page decides; the server checks again) */
export function CloseThreadButton({ threadId, closed }: { threadId: string; closed: boolean }) {
  const [state, action, pending] = useActionState(setClosedAction, null);

  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="threadId" value={threadId} />
      <input type="hidden" name="closed" value={closed ? "false" : "true"} />
      <Button type="submit" variant="secondary" disabled={pending} className="h-9 px-3 text-[13px]">
        {closed ? (
          <><RotateCcw size={14} aria-hidden="true" /> Reopen</>
        ) : (
          <><CheckCircle2 size={14} aria-hidden="true" /> Mark resolved</>
        )}
      </Button>
      {state && !state.ok && <span className="text-[12px] text-danger" role="alert">{state.message}</span>}
    </form>
  );
}