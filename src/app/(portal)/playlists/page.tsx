import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, Music, Plus } from "lucide-react";
import { can } from "@/lib/roles";
import { requireUser } from "@/lib/session";
import { shortDate } from "@/lib/format";
import type { PlaylistProvider } from "@/lib/playlist-url";
import { listPlaylists } from "@/server/playlists";
import { Panel } from "@/components/ui/Panel";
import { DeletePlaylistForm, EditPlaylistForm } from "./PlaylistForms";

export const metadata: Metadata = { title: "Music Playlists" };
export const instant = false; // reads the session; blocks on the server by design (see (portal)/layout.tsx)

/*
  Everyone sees the playlists; organizers also get "New playlist" and
  edit/delete (the actions re-check the role on the server).
  Links open in a new tab with noopener + noreferrer: the opened page can't
  redirect this tab, and the portal's address isn't sent to the service.
  Each card shows the destination host so people can see where it goes.
*/

/*
  Soft, light bands with dark text (white text would be unreadable on
  pastels). The Play button is light: a pale tint of its
  service colour with deep text in the same colour. Full class strings so Tailwind can find them.
*/
const STYLE: Record<PlaylistProvider, { name: string; band: string; button: string; glow: string }> = {
  spotify: {
    name: "Spotify",
    band: "bg-linear-to-r from-emerald-300 via-teal-200 to-yellow-100",
    button: "bg-emerald-50 text-emerald-800 ring-emerald-200 hover:bg-emerald-100",
    glow: "shadow-[0_22px_45px_-22px_rgb(16_185_129/0.45)] hover:shadow-[0_26px_55px_-20px_rgb(16_185_129/0.6)]",
  },
  youtube: {
    name: "YouTube",
    band: "bg-linear-to-r from-rose-400 to-orange-300",
    button: "bg-rose-50 text-rose-700 ring-rose-200 hover:bg-rose-100",
    glow: "shadow-[0_22px_45px_-22px_rgb(251_113_133/0.55)] hover:shadow-[0_26px_55px_-20px_rgb(251_113_133/0.7)]",
  },
  youtube_music: {
    name: "YouTube Music",
    band: "bg-linear-to-r from-indigo-200 via-red-200 to-yellow-100",
    button: "bg-indigo-50 text-indigo-700 ring-indigo-200 hover:bg-indigo-100",
    glow: "shadow-[0_22px_45px_-22px_rgb(129_140_248/0.5)] hover:shadow-[0_26px_55px_-20px_rgb(129_140_248/0.65)]",
  },
  soundcloud: {
    name: "SoundCloud",
    band: "bg-linear-to-r from-red-200 via-red-300 to-yellow-200",
    button: "bg-orange-50 text-orange-800 ring-orange-200 hover:bg-orange-100",
    glow: "shadow-[0_22px_45px_-22px_rgb(252_165_165/0.6)] hover:shadow-[0_26px_55px_-20px_rgb(252_165_165/0.75)]",
  },
};

/* Soft colour glows: decoration only, hidden from screen readers */
function Backdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
      <div className="absolute -top-16 left-[4%] size-72 rounded-full bg-emerald-300/30 blur-3xl" />
      <div className="absolute top-10 right-[6%] size-80 rounded-full bg-fuchsia-300/25 blur-3xl" />
      <div className="absolute top-[45%] left-[30%] size-96 rounded-full bg-orange-200/35 blur-3xl" />
      <div className="absolute right-[18%] bottom-0 size-72 rounded-full bg-sky-200/35 blur-3xl" />
    </div>
  );
}

export default async function PlaylistsPage() {
  const viewer = await requireUser();
  const isOrganizer = can.manageContent(viewer.role);
  const playlists = await listPlaylists();

  return (
    <div className="relative isolate mx-auto flex max-w-[1100px] flex-col gap-6">
      <Backdrop />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-serif text-[34px] leading-tight font-semibold">Music Playlists</h1>
          <p className="mt-1 text-[14px] text-muted">The soundtrack of our class. Tap a card to listen.</p>
        </div>
        {isOrganizer && (
          <Link
            href="/playlists/new"
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-control bg-conic-[at_bottom_right] from-[#ff4d4d] via-[#ff8364] to-[#fdb87d] px-5 text-[14px] font-semibold text-white shadow-[0_10px_24px_-10px_rgb(255_77_77/0.55)] transition-[filter,box-shadow] [text-shadow:0_1px_3px_rgb(120_20_20/0.45)] hover:brightness-95 hover:shadow-[0_14px_30px_-10px_rgb(255_77_77/0.65)]"
          >
            <Plus size={17} aria-hidden="true" /> New playlist
          </Link>
        )}
      </div>

      {playlists.length === 0 ? (
        <Panel className="p-6">
          <p className="text-[14px] text-muted">
            No playlists yet. {isOrganizer ? "Use New playlist to share the first one." : "Organizers will add the class soundtrack here."}
          </p>
        </Panel>
      ) : (
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {playlists.map((p) => {
            const s = STYLE[p.provider];
            return (
              <li
                key={p.id}
                className={`flex flex-col overflow-hidden rounded-panel border border-white/70 bg-white/85 backdrop-blur-sm transition-[transform,box-shadow] duration-300 hover:-translate-y-1 ${s.glow}`}
              >
                <div className={`relative isolate overflow-hidden px-5 pt-5 pb-6 text-[#2a1d1a] ${s.band}`}>
                  <Music
                    size={120}
                    strokeWidth={1.25}
                    className="absolute -right-6 -bottom-8 -z-10 rotate-12 text-white/45"
                    aria-hidden="true"
                  />
                  <span className="inline-flex rounded-full bg-white/55 px-2.5 py-0.5 text-[11px] font-semibold tracking-[0.12em] uppercase ring-1 ring-white/70 backdrop-blur-sm">
                    {s.name}
                  </span>
                  <h2 className="mt-3 font-serif text-[25px] leading-tight font-semibold break-words [text-shadow:0_1px_12px_rgb(255_255_255/0.6)]">
                    {p.title}
                  </h2>
                </div>

                <div className="flex flex-1 flex-col gap-4 p-5">
                  {p.description && (
                    <p className="text-[14px] leading-relaxed break-words whitespace-pre-line text-ink">{p.description}</p>
                  )}
                  <p className="text-[12px] text-muted">
                    Added by <span className="capitalize">{p.createdByName}</span> · {shortDate(p.createdAt)}
                  </p>

                  <div className="mt-auto flex flex-col gap-1.5">
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex h-11 items-center justify-center gap-2 rounded-control px-4 text-[14px] font-semibold ring-1 shadow-[0_4px_12px_-8px_rgb(60_30_20/0.3)] transition-[background-color,box-shadow] hover:shadow-[0_8px_18px_-8px_rgb(60_30_20/0.35)] ${s.button}`}
                    >
                      Play on {s.name} <ExternalLink size={15} aria-hidden="true" />
                      <span className="sr-only">(opens in a new tab)</span>
                    </a>
                    <p className="text-center text-[11px] text-muted">Opens {p.host}</p>
                  </div>

                  {isOrganizer && (
                    <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-line pt-3 [&>details[open]]:basis-full">
                      <EditPlaylistForm key={p.url + p.title} playlist={p} />
                      <DeletePlaylistForm id={p.id} title={p.title} />
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
