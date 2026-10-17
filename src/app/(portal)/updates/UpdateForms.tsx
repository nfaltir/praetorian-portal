"use client";

import { useActionState } from "react";
import { Pencil, Send, Trash2 } from "lucide-react";
import { Alert, Button, Field } from "@/components/ui/Form";
import { Panel } from "@/components/ui/Panel";
import {
  createUpdateAction,
  deleteUpdateAction,
  editUpdateAction,
  type UpdateActionResult,
} from "./actions";

/*
  Organizer forms for updates. All submit through server actions (POST).
  Categories come in as a prop so this client file never imports the
  database schema.
*/

type Values = { title: string; body: string; category: string };

/* React 19 resets a form after its action runs. Bumping a key on every
   submit remounts the fields so they show the right values: what was
   typed (after an error) or blank/saved values (after success). */
function useCountedAction(action: (prev: UpdateActionResult, form: FormData) => Promise<UpdateActionResult>) {
  return useActionState(
    async (prev: { result: UpdateActionResult; n: number } | null, form: FormData) => ({
      result: await action(null, form),
      n: (prev?.n ?? 0) + 1,
    }),
    null,
  );
}

function PostFields({ idPrefix, categories, values }: { idPrefix: string; categories: readonly string[]; values?: Values }) {
  return (
    <>
      <Field
        id={`${idPrefix}-title`}
        name="title"
        label="Title"
        maxLength={120}
        autoComplete="off"
        defaultValue={values?.title}
        required
      />
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${idPrefix}-category`} className="text-[14px] font-medium">Category (optional)</label>
        <select
          id={`${idPrefix}-category`}
          name="category"
          defaultValue={values?.category ?? ""}
          className="h-11 rounded-control border border-line bg-panel px-3 text-[15px]"
        >
          <option value="">None</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${idPrefix}-body`} className="text-[14px] font-medium">Update</label>
        <textarea
          id={`${idPrefix}-body`}
          name="body"
          rows={7}
          maxLength={5000}
          defaultValue={values?.body}
          required
          aria-describedby={`${idPrefix}-body-hint`}
          className="rounded-control border border-line bg-panel px-3.5 py-3 text-[15px] leading-relaxed text-ink outline-none transition-colors focus:border-brand"
        />
        <p id={`${idPrefix}-body-hint`} className="text-[12px] text-muted">
          Plain text. Line breaks are kept. Up to 5,000 characters. Every classmate can read it.
        </p>
      </div>
    </>
  );
}

export function NewUpdateForm({ categories }: { categories: readonly string[] }) {
  const [counted, action, pending] = useCountedAction(createUpdateAction);
  const state = counted?.result ?? null;
  const values = state && !state.ok ? state.values : undefined;

  return (
    <Panel className="p-6" labelledBy="new-update-heading">
      <h2 id="new-update-heading" className="flex items-center gap-2 font-serif text-[22px] font-semibold">
        <Send size={19} className="text-brand" aria-hidden="true" /> Post an update
      </h2>
      <form key={counted?.n ?? 0} action={action} className="mt-5 flex flex-col gap-4">
        <PostFields idPrefix="new" categories={categories} values={values} />
        <div>
          <Button type="submit" disabled={pending}>{pending ? "Posting..." : "Post update"}</Button>
        </div>
      </form>
      {state?.message && (
        <div className="mt-4"><Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert></div>
      )}
    </Panel>
  );
}

export function EditUpdateForm({
  post,
  categories,
}: {
  post: { id: string; title: string; body: string; category?: string };
  categories: readonly string[];
}) {
  const [counted, action, pending] = useCountedAction(editUpdateAction);
  const state = counted?.result ?? null;
  const values: Values =
    state && !state.ok && state.values
      ? state.values
      : { title: post.title, body: post.body, category: post.category ?? "" };

  return (
    <details className="group">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-[13px] font-medium text-brand hover:underline [&::-webkit-details-marker]:hidden">
        <Pencil size={13} aria-hidden="true" /> Edit
      </summary>
      <form key={counted?.n ?? 0} action={action} className="mt-3 flex flex-col gap-4 rounded-control border border-line bg-page p-4">
        <input type="hidden" name="id" value={post.id} />
        <PostFields idPrefix={`edit-${post.id}`} categories={categories} values={values} />
        <div>
          <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Save changes"}</Button>
        </div>
        {state?.message && <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert>}
      </form>
    </details>
  );
}

/* Two steps: open the disclosure, then confirm. Never one stray click. */
export function DeleteUpdateForm({ id, title }: { id: string; title: string }) {
  const [state, action, pending] = useActionState(deleteUpdateAction, null);

  return (
    <details className="group">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-[13px] font-medium text-danger hover:underline [&::-webkit-details-marker]:hidden">
        <Trash2 size={13} aria-hidden="true" /> Delete
      </summary>
      <form action={action} className="mt-3 flex flex-col gap-2 rounded-control border border-danger/25 bg-danger-tint p-4">
        <input type="hidden" name="id" value={id} />
        <p className="text-[13px] text-ink">
          Delete &ldquo;{title}&rdquo;? Classmates will no longer see it. The deletion is logged.
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