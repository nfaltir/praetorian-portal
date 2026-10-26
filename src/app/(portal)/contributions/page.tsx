import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CircleCheck, Undo2 } from "lucide-react";
import { site } from "@/config/site";
import { memberProgress, reversedIds, totalsByMember } from "@/lib/ledger";
import { money, percent, shortDate } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { loadMemberLedger, loadRoster } from "@/server/ledger";
import { Badge, Panel, ProgressBar } from "@/components/ui/Panel";

export const metadata: Metadata = { title: "My Contributions" };
export const instant = false; // reads the session; blocks on the server by design (see (portal)/layout.tsx)

/*
  The signed-in member's own contributions and target.
  - Targets and contributions are public to the class (agreed by the
    class); this page is the personal view. Everyone's is on /treasury.
  - Treasurer notes are not shown here; they stay on the treasury page.
*/
export default async function MyContributionsPage() {
  const me = await requireUser();

  const [entries, roster] = await Promise.all([loadMemberLedger(me.id), loadRoster()]);
  const targetCents = roster.find((m) => m.id === me.id)?.targetCents ?? site.defaultTargetCents;
  const given = totalsByMember(entries).get(me.id) ?? 0;
  const p = memberProgress(targetCents, given);
  const reversed = reversedIds(entries);
  const paymentCount = entries.filter((e) => e.kind === "payment" && !reversed.has(e.id)).length;

  return (
    <div className="mx-auto flex max-w-[860px] flex-col gap-6">
      <div>
        <h1 className="font-serif text-[34px] leading-tight font-semibold">My Contributions</h1>
        <p className="mt-1 text-[14px] text-muted">
          Payments the treasurers have recorded from the class bank account under your name.
        </p>
      </div>

      <Panel className="p-6" labelledBy="progress-heading">
        <h2 id="progress-heading" className="sr-only">Your progress</h2>
        <dl className="grid gap-5 sm:grid-cols-3">
          <div>
            <dt className="text-[13px] text-muted">You&apos;ve given</dt>
            <dd className="figures mt-1 text-[28px] leading-none font-semibold">{money(p.givenCents)}</dd>
          </div>
          <div>
            <dt className="text-[13px] text-muted">Your target</dt>
            <dd className="figures mt-1 text-[28px] leading-none font-semibold">{money(p.targetCents)}</dd>
          </div>
          <div>
            <dt className="text-[13px] text-muted">{p.overTargetCents > 0 ? "Above target" : "Remaining"}</dt>
            <dd className="figures mt-1 text-[28px] leading-none font-semibold">
              {money(p.overTargetCents > 0 ? p.overTargetCents : p.remainingCents)}
            </dd>
          </div>
        </dl>
        <div className="mt-5"><ProgressBar value={p.percent} label="Your progress toward your target" /></div>
        <p className="figures mt-2 text-[13px] text-muted">
          {percent(p.percent)} of your target · {paymentCount} {paymentCount === 1 ? "payment" : "payments"}
        </p>

        {p.overTargetCents > 0 ? (
          <p className="mt-4 rounded-control bg-success-tint px-3.5 py-2.5 text-[14px] text-success">
            <CircleCheck size={15} className="mr-1.5 inline -mt-0.5" aria-hidden="true" />
            You&apos;ve passed your target. Everything above it still counts toward the class goal. Thank you.
          </p>
        ) : p.remainingCents === 0 && p.targetCents > 0 ? (
          <p className="mt-4 rounded-control bg-success-tint px-3.5 py-2.5 text-[14px] text-success">
            <CircleCheck size={15} className="mr-1.5 inline -mt-0.5" aria-hidden="true" />
            Target reached. Thank you.
          </p>
        ) : null}

        <Link
          href="/treasury"
          className="mt-4 inline-flex items-center gap-1 text-[13px] font-medium text-brand hover:underline"
        >
          See the whole class on Treasury <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </Panel>

      <Panel className="overflow-hidden" labelledBy="history-heading">
        <h2 id="history-heading" className="px-6 pt-5 pb-3 font-serif text-[22px] font-semibold">History</h2>
        {entries.length === 0 ? (
          <div className="border-t border-line px-6 py-5 text-[14px] text-muted">
            <p>No payments recorded yet.</p>
            <p className="mt-1">
              Paid recently? It appears here once a treasurer matches it on the bank statement. Questions go to the{" "}
              <Link href="/messages" className="font-medium text-brand hover:underline">organizers</Link>.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-line border-t border-line">
            {entries.map((e) => {
              const isReversal = e.kind === "reversal";
              const wasReversed = reversed.has(e.id);
              return (
                <li key={e.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-6 py-3.5">
                  <span className="figures w-28 shrink-0 text-[13px] text-muted">
                    {shortDate(`${e.paidOn}T12:00:00Z`)}
                  </span>
                  <span
                    className={`figures text-[15px] font-semibold ${wasReversed ? "text-muted line-through" : isReversal ? "text-danger" : ""}`}
                  >
                    {isReversal ? `-${money(e.amountCents)}` : money(e.amountCents)}
                  </span>
                  <span className="ml-auto">
                    {isReversal ? (
                      <Badge tone="danger" icon={Undo2}>Correction</Badge>
                    ) : wasReversed ? (
                      <Badge tone="neutral" icon={Undo2}>Reversed</Badge>
                    ) : (
                      <Badge tone="success" icon={CircleCheck}>Recorded</Badge>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <p className="text-[12px] text-muted">
        The bank statement is the official record. If something here looks wrong, message the organizers and a
        treasurer will correct it.
      </p>
    </div>
  );
}
