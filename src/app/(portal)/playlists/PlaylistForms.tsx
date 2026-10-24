"use client";

import { useActionState, useState } from "react";
import { CircleCheck, Music, Pencil, Trash2 } from "lucide-react";
import { Alert, Button, Field } from "@/components/ui/Form";
import { Panel } from "@/components/ui/Panel";
import { parsePlaylistUrl, type PlaylistProvider } from "@/lib/playlist-url";
import {
  createPlaylistAction,
  deletePlaylistAction,
  editPlaylistAction,
  type PlaylistActionResult,
} from "./actions";

/*
  Organizer forms for playlists. The link is checked live in the browser
  for quick feedback only; the server runs the same check again and is
  the one that decides.
*/

type Values = { title: string; description: string; url: string };

const SERVICE: Record<PlaylistProvider, string> = {
  spotify: "Spotify",
  youtube: "YouTube",
  youtube_music: "YouTube Music",
  soundcloud: "SoundCloud",
};

/* React 19 resets a form after its action runs. Bumping a key on every
   submit remounts the fields so they show what was typed after an error. */
function useCountedAction(action: (prev: PlaylistActionResult, form: FormData) => Promise<PlaylistActionResult>) {
  return useActionState(
    async (prev: { result: PlaylistActionResult; n: number } | null, form: FormData) => ({
      result: await action(null, form),
      n: (prev?.n ?? 0) + 1,
    }),
    null,
  );
}

function LinkField({ id, initial }: { id: string; initial: string }) {
  const [value, setValue] = useState(initial);
  const [touched, setTouched] = useState(initial !== "");
  const check = value.trim() ? parsePlaylistUrl(value) : null;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[14px] font-medium">Playlist link</label>
      <input
        id={id}
        name="url"
        type="url"
        inputMode="url"
        autoComplete="off"
        spellCheck={false}
        placeholder="https://open.spotify.com/playlist/..."
        maxLength={500}
        required
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => setTouched(true)}
        aria-invalid={touched && check && !check.ok ? true : undefined}
        aria-describedby={`${id}-status`}
        className="h-11 rounded-control border border-muted/30 bg-page px-3.5 text-base text-ink outline-none transition-colors placeholder:text-muted/70 hover:border-muted/50 focus:border-brand focus:bg-panel aria-invalid:border-danger sm:text-[15px]"
      />
      <p id={`${id}-status`} className="text-[12px]" aria-live="polite">
        {check?.ok ? (
          <span className="inline-flex items-center gap-1 font-medium text-success">
            <CircleCheck size={13} aria-hidden="true" /> {SERVICE[check.provider]} playlist
          </span>
        ) : touched && check && !check.ok ? (
          <span className="text-danger">{check.message}</span>
        ) : (
          <span className="text-muted">Spotify, YouTube, YouTube Music or SoundCloud playlists. Paste the full address.</span>
        )}
      </p>
    </div>
  );
}

function PlaylistFields({ idPrefix, values }: { idPrefix: string; values?: Values }) {
  return (
    <>
      <Field
        id={`${idPrefix}-title`}
        name="title"
        label="Name"
        maxLength={80}
        autoComplete="off"
        placeholder="Class of 2010 Throwbacks"
        defaultValue={values?.title}
        required
      />
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${idPrefix}-description`} className="text-[14px] font-medium">Description (optional)</label>
        <textarea
          id={`${idPrefix}-description`}
          name="description"
          rows={3}
          maxLength={300}
          defaultValue={values?.description}
          placeholder="The songs from senior year dances."
          className="rounded-control border border-muted/30 bg-page px-3.5 py-3 text-base leading-relaxed text-ink outline-none transition-colors placeholder:text-muted/70 focus:border-brand focus:bg-panel sm:text-[15px]"
        />
      </div>
      <LinkField id={`${idPrefix}-url`} initial={values?.url ?? ""} />
    </>
  );
}

export function NewPlaylistForm() {
  const [counted, action, pending] = useCountedAction(createPlaylistAction);
  const state = counted?.result ?? null;
  const values = state && !state.ok ? state.values : undefined;

  return (
    <Panel className="p-6" labelledBy="new-playlist-heading">
      <h2 id="new-playlist-heading" className="flex items-center gap-2 font-serif text-[22px] font-semibold">
        <Music size={19} className="text-brand" aria-hidden="true" /> Add a playlist
      </h2>
      <form key={counted?.n ?? 0} action={action} className="mt-5 flex flex-col gap-4">
        <PlaylistFields idPrefix="new" values={values} />
        <div>
          <Button type="submit" disabled={pending}>{pending ? "Adding..." : "Add playlist"}</Button>
        </div>
      </form>
      {state && !state.ok && (
        <div className="mt-4"><Alert tone="error">{state.message}</Alert></div>
      )}
    </Panel>
  );
}

export function EditPlaylistForm({ playlist }: { playlist: { id: string; title: string; description: string | null; url: string } }) {
  const [counted, action, pending] = useCountedAction(editPlaylistAction);
  const state = counted?.result ?? null;
  const values: Values =
    state && !state.ok && state.values
      ? state.values
      : { title: playlist.title, description: playlist.description ?? "", url: playlist.url };

  return (
    <details>
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-[13px] font-medium text-brand hover:underline [&::-webkit-details-marker]:hidden">
        <Pencil size={13} aria-hidden="true" /> Edit
      </summary>
      <form key={counted?.n ?? 0} action={action} className="mt-3 flex flex-col gap-4 rounded-control border border-line bg-panel p-4">
        <input type="hidden" name="id" value={playlist.id} />
        <PlaylistFields idPrefix={`edit-${playlist.id}`} values={values} />
        <div>
          <Button type="submit" disabled={pending} className="h-10 px-4 text-[13px]">{pending ? "Saving..." : "Save changes"}</Button>
        </div>
        {state?.message && <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert>}
      </form>
    </details>
  );
}

/* Two steps: open the disclosure, then confirm. Never one stray click. */
export function DeletePlaylistForm({ id, title }: { id: string; title: string }) {
  const [state, action, pending] = useActionState(deletePlaylistAction, null);
  return (
    <details>
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-[13px] font-medium text-danger hover:underline [&::-webkit-details-marker]:hidden">
        <Trash2 size={13} aria-hidden="true" /> Delete
      </summary>
      <form action={action} className="mt-3 flex flex-col gap-2 rounded-control border border-danger/25 bg-danger-tint p-4">
        <input type="hidden" name="id" value={id} />
        <p className="text-[13px] text-ink">Delete &ldquo;{title}&rdquo;? Classmates will no longer see it. The deletion is logged.</p>
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
