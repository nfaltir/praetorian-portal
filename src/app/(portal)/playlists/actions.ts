"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { can } from "@/lib/roles";
import { requirePermission } from "@/lib/session";
import { createPlaylist, deletePlaylist, editPlaylist, PlaylistError } from "@/server/playlists";

/*
  Playlist server actions. Organizers only: requirePermission 404s anyone
  else, then src/server/playlists.ts checks the role and the link again.
*/

type PlaylistValues = { title: string; description: string; url: string };

export type PlaylistActionResult = {
  ok: boolean;
  message?: string;
  /* Echoed back on error so the form keeps what was typed */
  values?: PlaylistValues;
} | null;

function field(form: FormData, name: string, max: number) {
  return String(form.get(name) ?? "").slice(0, max);
}

function readPlaylist(form: FormData): PlaylistValues {
  return {
    // A little over the limits so the server, not truncation, reports "too long"
    title: field(form, "title", 120),
    description: field(form, "description", 400),
    url: field(form, "url", 600),
  };
}

async function run(fn: () => Promise<string>, values?: PlaylistValues): Promise<PlaylistActionResult> {
  try {
    const message = await fn();
    revalidatePath("/playlists");
    return { ok: true, message };
  } catch (e) {
    if (e instanceof PlaylistError) return { ok: false, message: e.message, values };
    throw e;
  }
}

export async function createPlaylistAction(_prev: PlaylistActionResult, form: FormData): Promise<PlaylistActionResult> {
  const actor = await requirePermission(can.manageContent);
  const values = readPlaylist(form);
  const result = await run(async () => {
    await createPlaylist(actor, values);
    return "Playlist added.";
  }, values);
  // Outside run(): redirect works by throwing, and run() must not catch it
  if (result?.ok) redirect("/playlists");
  return result;
}

export async function editPlaylistAction(_prev: PlaylistActionResult, form: FormData): Promise<PlaylistActionResult> {
  const actor = await requirePermission(can.manageContent);
  const id = field(form, "id", 64);
  const values = readPlaylist(form);
  return run(async () => {
    await editPlaylist(actor, id, values);
    return "Playlist saved.";
  }, values);
}

export async function deletePlaylistAction(_prev: PlaylistActionResult, form: FormData): Promise<PlaylistActionResult> {
  const actor = await requirePermission(can.manageContent);
  const id = field(form, "id", 64);
  return run(async () => {
    await deletePlaylist(actor, id);
    return "Playlist deleted.";
  });
}
