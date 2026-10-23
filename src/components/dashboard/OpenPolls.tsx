import Link from "next/link";
import { ArrowRight, CircleCheck } from "lucide-react";
import type { PollView } from "@/server/polls";
import { relativeTime } from "@/lib/format";
import { Panel, PanelHeader } from "@/components/ui/Panel";

/*
  Dashboard card: open polls only, closing soonest first. A nudge, not a
  ballot: voting happens on /polls, so the rules and results live in one
  place. No counts here, so the card can't show results early.
*/
export function OpenPolls({ polls, now }: { polls: PollView[]; now: Date }) {
  if (polls.length === 0) return null; // nothing to vote on, keep the dashboard clean

  return (
    <Panel className="p-5 sm:p-6" labelledBy="open-polls-heading">
      <PanelHeader id="open-polls-heading" title="Open Polls" href="/polls" />
      <ul className="mt-2 divide-y divide-line">
        {polls.map((p) => {
          const voted = p.myOptionId !== null;
          return (
            <li key={p.id}>
              <Link
                href={`/polls#poll-${p.id}-q`}
                className="group flex items-center gap-3 py-4 hover:text-brand"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[16px] leading-snug font-semibold group-hover:underline">{p.question}</p>
                  <p className="mt-1 text-[13px] text-muted">
                    Closes <time dateTime={p.closesAt}>{relativeTime(p.closesAt, now)}</time>
                    <span className="figures"> · {p.totalVotes} {p.totalVotes === 1 ? "vote" : "votes"}</span>
                  </p>
                </div>
                {voted ? (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-success-tint px-2.5 py-1 text-[12px] font-medium text-success">
                    <CircleCheck size={13} aria-hidden="true" /> Voted
                  </span>
                ) : (
                  <span className="inline-flex h-9 shrink-0 items-center gap-1 rounded-control bg-brand px-3.5 text-[13px] font-medium text-on-dark group-hover:bg-brand-ink">
                    Vote <ArrowRight size={14} aria-hidden="true" />
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
