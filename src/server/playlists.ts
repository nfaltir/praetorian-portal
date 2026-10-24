import "server-only";
import { randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { auditLog, playlist, user } from "@/db/schema";
import { can } from "@/lib/roles";
import { parsePlaylistUrl, type PlaylistProvider } from "@/lib/playlist-url";
import type { CurrentUser } from "@/lib/session";

/*
  Music playlists: the only code that writes the playlist table.
  - Organizers create, edit and delete; everyone signed in can view.
  - Every link goes through parsePlaylistUrl (allowlist + rebuilt URL).
    What the organizer pasted is never stored.
  - Each write and its audit record happen in ONE transaction, with the
    stored link in the audit detail so a bad link can be traced to its author.
*/

export class PlaylistError extends Error {}

export type PlaylistCard = {
  id: string;
  title: string;
  description: string | null;
  provider: PlaylistProvider;
  url: string;
  host: string; // shown on the card so people can see where the button goes
  createdByName: string;
  createdAt: string;
};

function clean(s: string) {
  return s
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim();
}

const oneLine = (s: string) => clean(s).replace(/\s+/g, " ");

const playlistSchema = z.object({
  title: z
    .string()
    .transform(oneLine)
    .pipe(z.string().min(1, "Give the playlist a name").max(80, "Keep the name under 80 characters")),
  description: z
    .string()
    .nullable()
    .optional()
    .transform((v) => (v ? clean(v) : "") || null)
    .pipe(z.string().max(300, "Keep the description under 300 characters").nullable()),
  url: z.string(),
});

export type PlaylistInput = z.input<typeof playlistSchema>;

function assertStaff(actor: CurrentUser) {
  if (!can.manageContent(actor.role)) throw new PlaylistError("Only organizers can manage playlists.");
}

function check(input: PlaylistInput) {
  const r = playlistSchema.safeParse(input);
  if (!r.success) throw new PlaylistError(r.error.issues[0]?.message ?? "Check the form and try again.");
  const link = parsePlaylistUrl(r.data.url);
  if (!link.ok) throw new PlaylistError(link.message);
  return { title: r.data.title, description: r.data.description, provider: link.provider, url: link.url };
}

export async function createPlaylist(actor: CurrentUser, input: PlaylistInput) {
  assertStaff(actor);
  const data = check(input);
  const id = randomUUID();
  await db.transaction(async (tx) => {
    await tx.insert(playlist).values({ id, ...data, createdBy: actor.id });
    await tx.insert(auditLog).values({
      id: randomUUID(),
      actorId: actor.id,
      action: "playlist.created",
      detail: { playlistId: id, title: data.title, url: data.url },
    });
  });
  return { id };
}

export async function editPlaylist(actor: CurrentUser, id: string, input: PlaylistInput) {
  assertStaff(actor);
  const data = check(input);
  await db.transaction(async (tx) => {
    const [before] = await tx.select().from(playlist).where(eq(playlist.id, id)).for("update");
    if (!before) throw new PlaylistError("That playlist no longer exists.");
    await tx.update(playlist).set({ ...data, updatedAt: new Date() }).where(eq(playlist.id, id));
    await tx.insert(auditLog).values({
      id: randomUUID(),
      actorId: actor.id,
      action: "playlist.edited",
      detail: { playlistId: id, title: data.title, url: data.url, previousUrl: before.url },
    });
  });
}

export async function deletePlaylist(actor: CurrentUser, id: string) {
  assertStaff(actor);
  await db.transaction(async (tx) => {
    const [before] = await tx.select().from(playlist).where(eq(playlist.id, id)).for("update");
    if (!before) throw new PlaylistError("That playlist was already deleted.");
    await tx.delete(playlist).where(eq(playlist.id, id));
    await tx.insert(auditLog).values({
      id: randomUUID(),
      actorId: actor.id,
      action: "playlist.deleted",
      targetUserId: before.createdBy,
      detail: { playlistId: id, title: before.title, url: before.url },
    });
  });
}

/* ---------- Reads ---------- */

/* Newest first */
export async function listPlaylists(): Promise<PlaylistCard[]> {
  const rows = await db
    .select({
      id: playlist.id,
      title: playlist.title,
      description: playlist.description,
      provider: playlist.provider,
      url: playlist.url,
      createdByName: user.name,
      createdAt: playlist.createdAt,
    })
    .from(playlist)
    .innerJoin(user, eq(user.id, playlist.createdBy))
    .orderBy(desc(playlist.createdAt));

  return rows.map((r) => ({
    ...r,
    host: new URL(r.url).hostname,
    createdAt: r.createdAt.toISOString(),
  }));
}
