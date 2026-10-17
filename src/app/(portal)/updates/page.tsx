import type { Metadata } from "next";
import { UPDATE_CATEGORIES } from "@/db/schema";
import { can } from "@/lib/roles";
import { requireUser } from "@/lib/session";
import { initials, longDate, relativeTime } from "@/lib/format";
import { loadUpdates } from "@/server/updates";
import { Panel } from "@/components/ui/Panel";
import { DeleteUpdateForm, EditUpdateForm, NewUpdateForm } from "./UpdateForms";

export const metadata: Metadata = { title: "Updates" };
export const instant = false; // reads the session; blocks on the server by design (see (portal)/layout.tsx)

/*
  Everyone reads updates. Organizers (staff) also see the post form and
  edit/delete controls; the actions re-check the role on the server.
  Post text is rendered as plain text (React escapes it), never as HTML.
*/
export default async function UpdatesPage() {
  const viewer = await requireUser();
  const isOrganizer = can.manageContent(viewer.role);
  const now = new Date();
  const updates = await loadUpdates();

  return (
    <div className="mx-auto flex max-w-215 flex-col gap-6">
      <div>
        <h1 className="font-serif text-[34px] leading-tight font-semibold">Updates</h1>
        <p className="mt-1 text-[14px] text-muted">Planning news from the reunion organizers.</p>
      </div>

      {isOrganizer && <NewUpdateForm categories={UPDATE_CATEGORIES} />}

      {updates.length === 0 ? (
        <Panel className="p-6">
          <p className="text-[14px] text-muted">
            No updates yet. {isOrganizer ? "Your first post will appear here and on the dashboard." : "Organizers will post planning news here."}
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
                    <span className="font-medium">{u.authorName}</span>
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
                  <p className="mt-2 text-[15px] leading-relaxed wrap-break-word whitespace-pre-line">{u.body}</p>

                  {isOrganizer && (
                    <div className="mt-4 flex flex-col gap-2 border-t border-line pt-3">
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