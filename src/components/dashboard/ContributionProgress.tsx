import type { ClassSummary } from "@/lib/ledger";
import type { LedgerEntry, Member } from "@/lib/types";
import { money, percent, shortDate } from "@/lib/format";
import { Badge, Panel, PanelHeader, StatusIcons } from "@/components/ui/Panel";
import { GoalDonut } from "./GoalDonut";

/*
  Contributions are public to members (agreed): names and amounts.
  Individual targets are private, so nothing here reveals a target.
*/
export function ContributionProgress({
  summary,
  members,
  totals,
  recent,
  reversed,
}: {
  summary: ClassSummary;
  members: Member[];
  totals: Map<string, number>;
  recent: LedgerEntry[];
  reversed: Set<string>;
}) {
  const byId = new Map(members.map((m) => [m.id, m]));

  const ranked = members
    .map((m) => ({ member: m, cents: Math.max(0, totals.get(m.id) ?? 0) }))
    .sort((a, b) => b.cents - a.cents || a.member.name.localeCompare(b.member.name));
  const maxCents = Math.max(1, ...ranked.map((r) => r.cents));

  const legend = [
    { label: "Collected", value: summary.collectedCents, pct: summary.percent, swatch: "bg-brand" },
    { label: "Remaining", value: summary.remainingCents, pct: Math.max(0, 100 - summary.percent), swatch: "bg-brand-soft" },
  ];

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
          {legend.map((row) => (
            <div key={row.label} className="flex items-center gap-3 border-b border-line py-2.5">
              <dt className="flex flex-1 items-center gap-2.5">
                <span className={`size-3 rounded-full ${row.swatch}`} aria-hidden="true" />
                {row.label}
              </dt>
              <dd className="figures w-24 text-right font-semibold">{money(row.value)}</dd>
              <dd className="figures w-12 text-right text-muted">{percent(row.pct)}</dd>
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
          {summary.overTargetCents > 0 && (
            <p className="mt-1 text-[12px] text-muted">
              Includes <span className="figures font-medium text-ink">{money(summary.overTargetCents)}</span> given above individual targets.
            </p>
          )}
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
        <ol className="mt-3 grid gap-x-8 gap-y-2.5 md:grid-cols-2">
          {ranked.map(({ member, cents }) => (
            <li key={member.id} className="grid grid-cols-[minmax(0,9rem)_1fr_4.5rem] items-center gap-3 text-[13px]">
              <span className="truncate">{member.name}</span>
              <span className="h-2 overflow-hidden rounded-full bg-line" aria-hidden="true">
                {cents > 0 && (
                  <span
                    className="block h-full rounded-full bg-brand"
                    style={{ width: `${Math.max(3, (cents / maxCents) * 100)}%` }}
                  />
                )}
              </span>
              <span className={`figures text-right ${cents > 0 ? "font-medium" : "text-muted"}`}>
                {cents > 0 ? money(cents) : "None yet"}
              </span>
            </li>
          ))}
        </ol>
      </div>

      {/* Recent ledger entries */}
      <div className="mt-8">
        <h3 className="font-serif text-[19px] font-semibold">Recent Contributions</h3>
        {recent.length === 0 ? (
          <p className="mt-3 text-[14px] text-muted">No contributions recorded yet.</p>
        ) : (
          <div className="mt-3 overflow-hidden rounded-control border border-line">
            <table className="w-full text-[13px]">
              <thead className="bg-page text-left text-muted">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-medium">Date</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Classmate</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">Amount</th>
                  <th scope="col" className="hidden px-4 py-2.5 font-medium sm:table-cell">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {recent.map((e) => {
                  const isReversal = e.kind === "reversal";
                  const wasReversed = reversed.has(e.id);
                  return (
                    <tr key={e.id}>
                      <td className="figures px-4 py-2.5 whitespace-nowrap text-muted">{shortDate(e.paidOn)}</td>
                      <td className="px-4 py-2.5">{byId.get(e.memberId)?.name ?? "Unknown"}</td>
                      <td className={`figures px-4 py-2.5 text-right font-medium ${wasReversed ? "text-muted line-through decoration-1" : isReversal ? "text-danger" : ""}`}>
                        {isReversal ? `-${money(e.amountCents)}` : money(e.amountCents)}
                      </td>
                      <td className="hidden px-4 py-2.5 sm:table-cell">
                        {isReversal ? (
                          <Badge tone="danger" icon={StatusIcons.reversed}>Correction</Badge>
                        ) : wasReversed ? (
                          <Badge tone="neutral" icon={StatusIcons.reversed}>Reversed</Badge>
                        ) : (
                          <Badge tone="success" icon={StatusIcons.recorded}>Recorded</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Panel>
  );
}
