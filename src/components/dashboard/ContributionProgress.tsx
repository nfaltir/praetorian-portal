import { ChevronDown, Star } from "lucide-react";
import { site } from "@/config/site";
import type { ClassSummary } from "@/lib/ledger";
import type { Member } from "@/lib/types";
import { money, percent } from "@/lib/format";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { GoalDonut } from "./GoalDonut";

/*
  Contributions are public to members (agreed): names and amounts.
  Individual targets are private, so nothing here reveals a target.
  Classmates who have contributed are always listed; the rest sit behind
  a toggle so the card stays compact as the class grows.
*/
export function ContributionProgress({
  summary,
  members,
  totals,
}: {
  summary: ClassSummary;
  members: Member[];
  totals: Map<string, number>;
}) {
  const ranked = members
    .map((m) => ({ member: m, cents: Math.max(0, totals.get(m.id) ?? 0) }))
    .sort((a, b) => b.cents - a.cents || a.member.name.localeCompare(b.member.name));
  const given = ranked.filter((r) => r.cents > 0);
  const notYet = ranked.filter((r) => r.cents === 0);
  // Bars measure progress toward the standard (public) target, not each
  // other, so one large gift doesn't shrink everyone else's bar.
  const barScale = Math.max(1, site.defaultTargetCents);

  const legend = [
    { label: "Collected", value: summary.collectedCents, pct: summary.percent, swatch: "bg-linear-to-br from-[#e11d48] via-[#f97316] to-[#facc15]" },
    { label: "Remaining", value: summary.remainingCents, pct: Math.max(0, 100 - summary.percent), swatch: "bg-brand-soft" },
  ];

  const row = ({ member, cents }: { member: Member; cents: number }) => {
    // Measured against the public standard amount, never a private target
    const beyond = cents > barScale;
    return (
      <li key={member.id} className="grid grid-cols-[minmax(0,9rem)_1fr_4.5rem] items-center gap-3 text-[13px]">
        <span className="flex min-w-0 items-center gap-1">
          <span className="truncate">{member.name}</span>
          {beyond && (
            <>
              <Star size={12} className="shrink-0 fill-accent text-accent" aria-hidden="true" />
              <span className="sr-only">(gave above {money(barScale)})</span>
            </>
          )}
        </span>
        <span className="h-2 overflow-hidden rounded-full bg-line" aria-hidden="true">
          {cents > 0 && (
            <span
              className={`block h-full rounded-full ${beyond ? "bg-accent" : "bg-brand"}`}
              style={{ width: `${Math.min(100, Math.max(3, (cents / barScale) * 100))}%` }}
            />
          )}
        </span>
        <span className={`figures text-right ${cents > 0 ? "font-medium" : "text-muted"}`}>
          {cents > 0 ? money(cents) : "None yet"}
        </span>
      </li>
    );
  };

  return (
    <Panel className="p-5 sm:p-6" labelledBy="progress-heading">
      <PanelHeader id="progress-heading" title="Contribution Progress" href="/treasury" linkLabel="Treasury" />

      {/* Goal: donut plus the same figures in text */}
      <div className="mt-5 flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-10">
        <div className="relative shrink-0">
          <GoalDonut
            collectedCents={summary.collectedCents}
            remainingCents={summary.remainingCents}
            collectedLabel={money(summary.collectedCents)}
            remainingLabel={money(summary.remainingCents)}
          />
          <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
            <p className="figures font-serif text-[30px] leading-none font-semibold">{money(summary.collectedCents)}</p>
            <p className="mt-1 text-[12px] text-muted">collected</p>
            <p className="figures text-[13px] font-medium text-brand">{percent(summary.percent)}</p>
          </div>
        </div>

        <dl className="w-full max-w-sm text-[14px]">
          {legend.map((r) => (
            <div key={r.label} className="flex items-center gap-3 border-b border-line py-2.5">
              <dt className="flex flex-1 items-center gap-2.5">
                <span className={`size-3 rounded-full ${r.swatch}`} aria-hidden="true" />
                {r.label}
              </dt>
              <dd className="figures w-24 text-right font-semibold">{money(r.value)}</dd>
              <dd className="figures w-12 text-right text-muted">{percent(r.pct)}</dd>
            </div>
          ))}
          <div className="flex items-center gap-3 py-2.5">
            <dt className="flex flex-1 items-center gap-2.5">
              <span className="size-3 rounded-full border border-line" aria-hidden="true" />
              Class goal
            </dt>
            <dd className="figures w-24 text-right font-semibold">{money(summary.goalCents)}</dd>
            <dd className="w-12" />
          </div>
        </dl>
      </div>

      {/* Who has contributed: dollars only, no targets */}
      <div className="mt-8">
        <div className="flex items-baseline justify-between">
          <h3 className="font-serif text-[19px] font-semibold">Who has contributed</h3>
          <p className="figures text-[13px] text-muted">
            {summary.contributorCount} of {members.length} classmates
          </p>
        </div>

        {given.length > 0 ? (
          <ol className="mt-3 grid gap-x-8 gap-y-2.5 md:grid-cols-2">{given.map(row)}</ol>
        ) : (
          <p className="mt-3 text-[14px] text-muted">No contributions yet.</p>
        )}

        {notYet.length > 0 && (
          <details className="group mt-3">
            <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-[13px] font-medium text-brand [&::-webkit-details-marker]:hidden">
              <ChevronDown size={14} className="transition-transform group-open:rotate-180" aria-hidden="true" />
              <span className="group-open:hidden">Show the {notYet.length} still to contribute</span>
              <span className="hidden group-open:inline">Hide</span>
            </summary>
            <ol className="mt-3 grid gap-x-8 gap-y-2.5 md:grid-cols-2">{notYet.map(row)}</ol>
          </details>
        )}

        {given.some((r) => r.cents > barScale) && (
          <p className="mt-3 flex items-center gap-1.5 text-[12px] text-muted">
            <Star size={12} className="fill-accent text-accent" aria-hidden="true" />
            Gave above the standard {money(barScale)}. Thank you!
          </p>
        )}
      </div>
    </Panel>
  );
}
