import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { UPDATE_CATEGORIES } from "@/db/schema";
import { can } from "@/lib/roles";
import { requireUser } from "@/lib/session";
import { initials, longDate, relativeTime } from "@/lib/format";
import { loadUpdates } from "@/server/updates";
import { Panel } from "@/components/ui/Panel";
import { DeleteUpdateForm, EditUpdateForm } from "./UpdateForms";

export const metadata: Metadata = { title: "Updates" };
export const instant = false; // reads the session; blocks on the server by design (see (portal)/layout.tsx)

/*
  Everyone reads updates. Organizers (staff) also see a "New update"
  button (form lives at /updates/new) and edit/delete controls; the
  actions re-check the role on the server.
  Post text is rendered as plain text (React escapes it), never as HTML.
*/
export default async function UpdatesPage() {
  const viewer = await requireUser();
  const isOrganizer = can.manageContent(viewer.role);
  const now = new Date();
  const updates = await loadUpdates();

  return (
    <div className="mx-auto flex max-w-[860px] flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-serif text-[34px] leading-tight font-semibold">Updates</h1>
          <p className="mt-1 text-[14px] text-muted">Planning news from the reunion organizers.</p>
        </div>
        {isOrganizer && (
          <Link
            href="/updates/new"
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-control bg-brand px-5 text-[14px] font-medium text-on-dark transition-colors hover:bg-brand-ink"
          >
            <Plus size={17} aria-hidden="true" /> New update
          </Link>
        )}
      </div>

      {updates.length === 0 ? (
        <Panel className="p-6">
          <p className="text-[14px] text-muted">
            No updates yet. {isOrganizer ? "Use New update to post planning news. It also appears on the dashboard." : "Organizers will post planning news here."}
          </p>
        </Panel>
      ) : (
        <div className="flex flex-col gap-4">
          {updates.map((u) => (
            <Panel key={u.id} as="article" className="scroll-mt-6 p-6" labelledBy={`update-${u.id}-title`}>
              <div id={u.id} className="flex items-start gap-3.5">
                <span
                  className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-tint text-[13px] font-semibold text-ink"
                  aria-hidden="true"
                >
                  {initials(u.authorName)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]">
                    <span className="font-medium capitalize">{u.authorName}</span>
                    <time dateTime={u.publishedAt} title={longDate(u.publishedAt)} className="text-muted">
                      {relativeTime(u.publishedAt, now)}
                    </time>
                    {u.editedAt && (
                      <span className="text-muted" title={`Edited ${longDate(u.editedAt)}`}>· edited</span>
                    )}
                    {u.category && (
                      <span className="rounded-full bg-brand-tint px-2 py-0.5 text-[12px] font-medium text-brand">
                        {u.category}
                      </span>
                    )}
                  </p>
                  <h2 id={`update-${u.id}-title`} className="mt-1.5 font-serif text-[22px] leading-snug font-semibold">
                    {u.title}
                  </h2>
                  <p className="mt-2 text-[15px] leading-relaxed break-words whitespace-pre-line">{u.body}</p>

                  {isOrganizer && (
                    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-line pt-3 [&>details[open]]:basis-full">
                      <EditUpdateForm
                        key={u.editedAt ?? u.publishedAt}
                        post={{ id: u.id, title: u.title, body: u.body, category: u.category }}
                        categories={UPDATE_CATEGORIES}
                      />
                      <DeleteUpdateForm id={u.id} title={u.title} />
                    </div>
                  )}
                </div>
              </div>
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}
