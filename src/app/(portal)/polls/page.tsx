import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { site } from "@/config/site";
import { can } from "@/lib/roles";
import { requireUser } from "@/lib/session";
import { listPolls } from "@/server/polls";
import { Panel } from "@/components/ui/Panel";
import { ClosePollForm, DeletePollForm, PollBody } from "./PollForms";

export const metadata: Metadata = { title: "Polls" };
export const instant = false; // reads the session; blocks on the server by design (see (portal)/layout.tsx)

/*
  Everyone sees every poll and can vote on open ones. Organizers also see
  a "New poll" button (form lives at /polls/new) and close/delete controls;
  the actions re-check the role on the server. Counts reach the page only
  when the poll's results rule allows it (decided in src/server/polls.ts),
  never who voted what.
*/

const TZ_LABEL = "Chuuk time";

const closeTime = new Intl.DateTimeFormat("en-US", {
  timeZone: site.timeZone,
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export default async function PollsPage() {
  const viewer = await requireUser();
  const isOrganizer = can.manageContent(viewer.role);
  const polls = await listPolls(viewer);
  const open = polls.filter((p) => !p.closed);
  const closed = polls.filter((p) => p.closed);

  return (
    <div className="mx-auto flex max-w-[860px] flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-serif text-[34px] leading-tight font-semibold">Polls</h1>
          <p className="mt-1 text-[14px] text-muted">
            Help the organizers decide. Votes are private: only totals are shown, never who picked what.
          </p>
        </div>
        {isOrganizer && (
          <Link
            href="/polls/new"
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-control bg-brand px-5 text-[14px] font-medium text-on-dark transition-colors hover:bg-brand-ink"
          >
            <Plus size={17} aria-hidden="true" /> New poll
          </Link>
        )}
      </div>

      {polls.length === 0 && (
        <Panel className="p-6">
          <p className="text-[14px] text-muted">
            No polls yet. {isOrganizer ? "Use New poll to ask the class something." : "Organizers will post questions here."}
          </p>
        </Panel>
      )}

      {[
        { title: "Open", list: open },
        { title: "Closed", list: closed },
      ].map(
        (group) =>
          group.list.length > 0 && (
            <section key={group.title} className="flex flex-col gap-4" aria-label={`${group.title} polls`}>
              <h2 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-muted">{group.title}</h2>
              {group.list.map((p) => (
                <Panel key={p.id} as="article" className="p-5 sm:p-6" labelledBy={`poll-${p.id}-q`}>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px]">
                    <span
                      className={`rounded-full px-2 py-0.5 font-medium ${p.closed ? "bg-line text-muted" : "bg-success-tint text-success"}`}
                    >
                      {p.closed ? "Closed" : "Open"}
                    </span>
                    <span className="text-muted">
                      {p.closed ? "Closed" : "Closes"} <time dateTime={p.endedAt ?? p.closesAt}>{closeTime.format(new Date(p.endedAt ?? p.closesAt))}</time> {TZ_LABEL}
                    </span>
                    <span className="figures text-muted">
                      · {p.totalVotes} {p.totalVotes === 1 ? "vote" : "votes"}
                    </span>
                  </div>
                  <h3 id={`poll-${p.id}-q`} className="mt-2 font-serif text-[22px] leading-snug font-semibold">
                    {p.question}
                  </h3>
                  {p.details && (
                    <p className="mt-1.5 text-[14px] leading-relaxed break-words whitespace-pre-line text-muted">{p.details}</p>
                  )}

                  <div className="mt-4">
                    <PollBody key={`${p.myOptionId}-${p.closed}`} poll={p} />
                  </div>

                  {isOrganizer && (
                    <div className="mt-5 flex flex-col gap-2 border-t border-line pt-3">
                      {!p.closed && <ClosePollForm id={p.id} />}
                      <DeletePollForm id={p.id} question={p.question} votes={p.totalVotes} />
                    </div>
                  )}
                </Panel>
              ))}
            </section>
          ),
      )}
    </div>
  );
}
