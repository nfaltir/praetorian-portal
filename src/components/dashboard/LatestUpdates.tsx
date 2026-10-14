import Link from "next/link";
import type { Member, Update } from "@/lib/types";
import { initials, relativeTime } from "@/lib/format";
import { Panel, PanelHeader } from "@/components/ui/Panel";

const NEW_WINDOW_MS = 3 * 86_400_000;

export function LatestUpdates({ updates, members, now }: { updates: Update[]; members: Member[]; now: Date }) {
  const byId = new Map(members.map((m) => [m.id, m]));

  return (
    <Panel className="p-5 sm:p-6" labelledBy="updates-heading">
      <PanelHeader id="updates-heading" title="Latest Updates" href="/updates" />
      {updates.length === 0 ? (
        <p className="mt-4 text-[14px] text-muted">No updates yet. Organizers will post planning news here.</p>
      ) : (
        <ul className="mt-2 divide-y divide-line">
          {updates.map((u) => {
            const author = byId.get(u.authorId);
            const isNew = now.getTime() - new Date(u.publishedAt).getTime() < NEW_WINDOW_MS;
            return (
              <li key={u.id} className="py-4">
                <article className="flex gap-3.5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-tint text-[12px] font-semibold text-ink" aria-hidden="true">
                    {author ? initials(author.name) : "?"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-x-2 text-[13px]">
                      <span className="font-medium">{author?.name ?? "Organizer"}</span>
                      <time dateTime={u.publishedAt} className="text-muted">{relativeTime(u.publishedAt, now)}</time>
                      {isNew && (
                        <span className="rounded-full bg-accent px-1.5 text-[11px] font-semibold text-brand-ink">New</span>
                      )}
                    </p>
                    <h3 className="mt-1 text-[16px] font-semibold leading-snug">
                      <Link href={`/updates#${u.id}`} className="hover:text-brand hover:underline">{u.title}</Link>
                    </h3>
                    <p className="mt-1 line-clamp-2 text-[14px] leading-relaxed text-muted">{u.excerpt}</p>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
