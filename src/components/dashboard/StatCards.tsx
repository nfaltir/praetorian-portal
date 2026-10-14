import Link from "next/link";
import { ArrowRight, CalendarDays, CircleDollarSign, Users } from "lucide-react";
import type { ClassSummary } from "@/lib/ledger";
import type { ReunionEvent } from "@/lib/types";
import { longDate, money, percent } from "@/lib/format";
import { Panel, ProgressBar } from "@/components/ui/Panel";

function IconChip({ children }: { children: React.ReactNode }) {
  return <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-tint text-brand">{children}</span>;
}

export function StatCards({
  joined,
  added,
  summary,
  nextEvent,
}: {
  joined: number;
  added: number;
  summary: ClassSummary;
  nextEvent: ReunionEvent | null;
}) {
  const joinedPct = added > 0 ? (joined / added) * 100 : 0;
  const notJoined = added - joined;

  return (
    <div className="@container">
    <div className="grid gap-4 @lg:grid-cols-2 @2xl:grid-cols-3">
      <Panel as="div" className="flex gap-4 p-5">
        <IconChip><Users size={20} aria-hidden="true" /></IconChip>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-muted">Classmates joined</p>
          <p className="figures mt-1 text-[28px] leading-none font-semibold">
            {joined} <span className="text-[16px] font-normal text-muted">/ {added}</span>
          </p>
          <p className="mt-2 text-[13px] text-muted">
            {notJoined === 0 ? "Everyone is in" : `${notJoined} still to sign in`}
          </p>
          <div className="mt-3"><ProgressBar value={joinedPct} label="Classmates joined" /></div>
        </div>
      </Panel>

      <Panel as="div" className="flex gap-4 p-5">
        <IconChip><CircleDollarSign size={20} aria-hidden="true" /></IconChip>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-muted">Total contributions</p>
          <p className="figures mt-1 text-[28px] leading-none font-semibold">{money(summary.collectedCents)}</p>
          <p className="figures mt-2 text-[13px] text-muted">
            of {money(summary.goalCents)} goal · {percent(summary.percent)}
          </p>
          <div className="mt-3"><ProgressBar value={summary.percent} label="Class goal progress" /></div>
        </div>
      </Panel>

      <Panel as="div" className="flex gap-4 p-5 @lg:col-span-2 @2xl:col-span-1">
        <IconChip><CalendarDays size={20} aria-hidden="true" /></IconChip>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-muted">Next event</p>
          {nextEvent ? (
            <>
              <p className="mt-1 font-serif text-[21px] leading-tight font-semibold">{nextEvent.title}</p>
              <p className="mt-1 text-[13px] text-muted">{longDate(nextEvent.startsAt)}</p>
              <Link href="/events" className="mt-2 inline-flex items-center gap-1 text-[13px] font-medium text-brand hover:underline">
                View details <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </>
          ) : (
            <p className="mt-1 text-[14px] text-muted">Nothing confirmed yet</p>
          )}
        </div>
      </Panel>
    </div>
    </div>
  );
}
