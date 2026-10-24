import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { can } from "@/lib/roles";
import { requirePermission } from "@/lib/session";
import { NewPlaylistForm } from "../PlaylistForms";

export const metadata: Metadata = { title: "New playlist" };
export const instant = false; // reads the session; blocks on the server by design (see (portal)/layout.tsx)

/*
  Organizers only. requirePermission 404s everyone else, and the create
  action re-checks the role and the link on the server.
*/
export default async function NewPlaylistPage() {
  await requirePermission(can.manageContent);

  return (
    <div className="mx-auto flex max-w-[860px] flex-col gap-6">
      <div>
        <Link href="/playlists" className="inline-flex items-center gap-1 text-[13px] font-medium text-brand hover:underline">
          <ArrowLeft size={14} aria-hidden="true" /> All playlists
        </Link>
        <h1 className="mt-2 font-serif text-[34px] leading-tight font-semibold">New playlist</h1>
        <p className="mt-1 text-[14px] text-muted">Share a Spotify, YouTube, YouTube Music or SoundCloud playlist with the class.</p>
      </div>
      <NewPlaylistForm />
    </div>
  );
}
