import type { Metadata } from "next";
import { CircleCheck, Undo2 } from "lucide-react";
import { can } from "@/lib/roles";
import { requireUser } from "@/lib/session";
import { classSummary, reversedIds, totalsByMember } from "@/lib/ledger";
import { money, percent, shortDate } from "@/lib/format";
import { loadLedger, loadRoster, todayInPortalZone } from "@/server/ledger";
import { Badge, Panel, ProgressBar } from "@/components/ui/Panel";
import { RecordPaymentForm, ReverseEntryForm, TargetForm } from "./TreasuryForms";

export const metadata: Metadata = { title: "Treasury" };

/*
  Everyone sees class totals and who has given what (agreed: public).
  Treasurers additionally see targets, notes, and the record/reverse tools.
*/
export default async function TreasuryPage() {
  const viewer = await requireUser();
  const isTreasurer = can.manageLedger(viewer.role);

  const [ledger, roster] = await Promise.all([loadLedger(), loadRoster()]);
  const totals = totalsByMember(ledger);
  const targets = new Map(roster.map((m) => [m.id, m.targetCents]));
  const summary = classSummary(targets, totals);
  const reversed = reversedIds(ledger);
  const names = new Map(roster.map((m) => [m.id, m.name]));
  // Disabled members drop off the roster but keep their history: label them
  const nameOf = (id: string) => names.get(id) ?? "Former member";

  return (
    <div className="mx-auto flex max-w-1100px flex-col gap-6">
      <div>
        <h1 className="font-serif text-[34px] leading-tight font-semibold">Treasury</h1>
        <p className="mt-1 text-[14px] text-muted">
          A record of payments received in the class bank account. The bank statement is the official record.
        </p>
      </div>

      <Panel className="p-6" labelledBy="summary-heading">
        <h2 id="summary-heading" className="sr-only">Class totals</h2>
        <dl className="grid gap-5 sm:grid-cols-3">
          <div>
            <dt className="text-[13px] text-muted">Collected</dt>
            <dd className="figures mt-1 text-[28px] leading-none font-semibold">{money(summary.collectedCents)}</dd>
          </div>
          <div>
            <dt className="text-[13px] text-muted">Class goal</dt>
            <dd className="figures mt-1 text-[28px] leading-none font-semibold">{money(summary.goalCents)}</dd>
          </div>
          <div>
            <dt className="text-[13px] text-muted">Remaining</dt>
            <dd className="figures mt-1 text-[28px] leading-none font-semibold">{money(summary.remainingCents)}</dd>
          </div>
        </dl>
        <div className="mt-5"><ProgressBar value={summary.percent} label="Class goal progress" /></div>
        <p className="figures mt-2 text-[13px] text-muted">
          {percent(summary.percent)} of goal · {summary.contributorCount} of {roster.length} classmates have contributed
        </p>
      </Panel>

      {isTreasurer && (
        <RecordPaymentForm members={roster.map((m) => ({ id: m.id, name: m.name }))} today={todayInPortalZone()} />
      )}

      <Panel className="overflow-hidden" labelledBy="entries-heading">
        <h2 id="entries-heading" className="px-6 pt-5 pb-3 font-serif text-[22px] font-semibold">All entries</h2>
        {ledger.length === 0 ? (
          <p className="border-t border-line px-6 py-5 text-[14px] text-muted">No payments recorded yet.</p>
        ) : (
          <ul className="divide-y divide-line border-t border-line">
            {ledger.map((e) => {
              const isReversal = e.kind === "reversal";
              const wasReversed = reversed.has(e.id);
              return (
                <li key={e.id} className="flex flex-col gap-2 px-6 py-3.5 sm:flex-row sm:items-start">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px]">
                      <span className="font-medium">{nameOf(e.memberId)}</span>
                      <span
                        className={`figures font-semibold ${wasReversed ? "text-muted line-through" : isReversal ? "text-danger" : ""}`}
                      >
                        {isReversal ? `-${money(e.amountCents)}` : money(e.amountCents)}
                      </span>
                      {isReversal ? (
                        <Badge tone="danger" icon={Undo2}>Correction</Badge>
                      ) : wasReversed ? (
                        <Badge tone="neutral" icon={Undo2}>Reversed</Badge>
                      ) : (
                        <Badge tone="success" icon={CircleCheck}>Recorded</Badge>
                      )}
                    </p>
                    <p className="figures mt-0.5 text-[12px] text-muted">
                      Paid {shortDate(`${e.paidOn}T12:00:00Z`)}
                      {isTreasurer && <> · recorded by {nameOf(e.recordedBy)} on {shortDate(e.recordedAt)}</>}
                    </p>
                    {isTreasurer && e.memo && <p className="mt-0.5 text-[12px] text-muted">Note: {e.memo}</p>}
                  </div>
                  {isTreasurer && !isReversal && !wasReversed && (
                    <ReverseEntryForm entryId={e.id} summary={`${money(e.amountCents)} for ${nameOf(e.memberId)}`} />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      {isTreasurer && (
        <Panel className="overflow-hidden" labelledBy="targets-heading">
          <div className="px-6 pt-5 pb-3">
            <h2 id="targets-heading" className="font-serif text-[22px] font-semibold">Targets</h2>
            <p className="mt-1 text-[13px] text-muted">
              Private: only treasurers see these. The class goal is the sum of all targets. Every change is logged.
            </p>
          </div>
          <ul className="divide-y divide-line border-t border-line">
            {roster.map((m) => {
              const given = Math.max(0, totals.get(m.id) ?? 0);
              return (
                <li key={m.id} className="flex flex-col gap-2 px-6 py-3 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-medium">{m.name}</p>
                    <p className="figures text-[12px] text-muted">
                      Given {money(given)} of {money(m.targetCents)}
                    </p>
                  </div>
                  <TargetForm memberId={m.id} memberName={m.name} targetDollars={(m.targetCents / 100).toString()} />
                </li>
              );
            })}
          </ul>
        </Panel>
      )}
    </div>
  );
}