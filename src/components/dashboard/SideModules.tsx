import Link from "next/link";
import { CalendarPlus, CircleDollarSign, Newspaper, UserPlus, Vote } from "lucide-react";
import type { Activity, Poll, ReunionEvent } from "@/lib/types";
import { monthDay, relativeTime, shortDate, timeRange } from "@/lib/format";
import { Badge, Panel, PanelHeader, StatusIcons } from "@/components/ui/Panel";

export function UpcomingEvents({ events }: { events: ReunionEvent[] }) {
  return (
    <Panel className="p-5 sm:p-6" labelledBy="events-heading">
      <PanelHeader id="events-heading" title="Upcoming Events" href="/events" />
      {events.length === 0 ? (
        <p className="mt-4 text-[14px] text-muted">No events scheduled yet.</p>
      ) : (
        <ul className="mt-2 divide-y divide-line">
          {events.map((e) => {
            const { month, day } = monthDay(e.startsAt);
            return (
              <li key={e.id} className="flex gap-4 py-4">
                <div className="w-11 shrink-0 text-center" aria-hidden="true">
                  <p className="text-[11px] font-semibold tracking-wider text-muted">{month}</p>
                  <p className="figures font-serif text-[26px] leading-none font-semibold">{day}</p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-[15px] font-semibold leading-snug">
                    {e.title}
                    {e.status === "tentative" && <Badge tone="warning" icon={StatusIcons.tentative}>Tentative</Badge>}
                  </p>
                  <p className="figures mt-0.5 text-[13px] text-muted">
                    <span className="sr-only">{shortDate(e.startsAt)}, </span>
                    {timeRange(e.startsAt, e.endsAt)}
                  </p>
                  <p className="mt-0.5 text-[13px] text-muted">{e.location}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

const activityIcons = {
  update: Newspaper,
  contribution: CircleDollarSign,
  joined: UserPlus,
  poll: Vote,
  event: CalendarPlus,
} as const;

export function RecentActivity({ items, now }: { items: Activity[]; now: Date }) {
  if (items.length === 0) return null;
  return (
    <Panel className="p-5 sm:p-6" labelledBy="activity-heading">
      <PanelHeader id="activity-heading" title="Recent Activity" />
      <ul className="mt-4 flex flex-col gap-4">
        {items.map((a) => {
          const Icon = activityIcons[a.kind];
          return (
            <li key={a.id} className="flex gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-tint text-brand">
                <Icon size={16} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-[14px] leading-snug">{a.text}</p>
                <time dateTime={a.at} className="text-[12px] text-muted">{relativeTime(a.at, now)}</time>
              </div>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

export function PollPreview({ poll, now }: { poll: Poll; now: Date }) {
  const total = poll.options.reduce((s, o) => s + o.votes, 0);
  return (
    <Panel className="p-5 sm:p-6" labelledBy="poll-heading">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="rounded-full bg-accent-tint px-2 py-0.5 text-[11px] font-semibold tracking-wide text-ink uppercase">Poll</span>
          <h2 id="poll-heading" className="mt-2 font-serif text-[21px] leading-tight font-semibold">{poll.question}</h2>
        </div>
      </div>
      <p className="mt-1 text-[12px] text-muted">
        Closes {relativeTime(poll.closesAt, now)} · <span className="figures">{total}</span> votes
      </p>

      <ul className="mt-4 flex flex-col gap-3.5">
        {poll.options.map((o) => {
          const pct = total > 0 ? Math.round((o.votes / total) * 100) : 0;
          const mine = poll.myVoteOptionId === o.id;
          return (
            <li key={o.id}>
              <div className="flex items-baseline justify-between gap-3 text-[14px]">
                <span className={mine ? "font-semibold" : ""}>
                  {o.label}
                  {mine && <span className="ml-2 text-[12px] font-medium text-brand">Your vote</span>}
                </span>
                {poll.resultsVisible && (
                  <span className="figures text-[12px] text-muted">{pct}% ({o.votes})</span>
                )}
              </div>
              {poll.resultsVisible && (
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line" aria-hidden="true">
                  <div className={`h-full rounded-full ${mine ? "bg-brand" : "bg-brand-soft"}`} style={{ width: `${pct}%` }} />
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <Link
        href="/polls"
        className="mt-5 block rounded-control bg-brand-ink px-4 py-2.5 text-center text-[14px] font-medium text-on-dark transition-colors hover:bg-brand"
      >
        {poll.myVoteOptionId ? "Change your vote" : "Cast your vote"}
      </Link>
    </Panel>
  );
}
