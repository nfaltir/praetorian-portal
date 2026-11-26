import type { LedgerEntry, Member } from "@/lib/types";
import { money, shortDate } from "@/lib/format";
import { Badge, Panel, PanelHeader, StatusIcons } from "@/components/ui/Panel";

/*
  The latest few ledger entries for the dashboard. The full history lives
  on the Treasury page, so this card stays the same height however many
  contributions come in. The dashboard query should fetch only
  RECENT_LIMIT rows; the slice below is a safety net.
*/
export const RECENT_LIMIT = 5;

export function RecentContributions({
  members,
  recent,
  reversed,
}: {
  members: Member[];
  recent: LedgerEntry[];
  reversed: Set<string>;
}) {
  const byId = new Map(members.map((m) => [m.id, m]));
  const rows = recent.slice(0, RECENT_LIMIT);

  return (
    <Panel className="p-5 sm:p-6" labelledBy="recent-heading">
      <PanelHeader id="recent-heading" title="Recent Contributions" href="/treasury" linkLabel="View all" />

      {rows.length === 0 ? (
        <p className="mt-3 text-[14px] text-muted">No contributions recorded yet.</p>
      ) : (
        <div className="mt-4 overflow-hidden rounded-control border border-line">
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
              {rows.map((e) => {
                const isReversal = e.kind === "reversal";
                const wasReversed = reversed.has(e.id);
                return (
                  <tr key={e.id}>
                    <td className="figures px-4 py-2.5 whitespace-nowrap text-muted">{shortDate(e.paidOn)}</td>
                    <td className="px-4 py-2.5">{byId.get(e.memberId)?.name ?? "Unknown"}</td>
                    <td
                      className={`figures px-4 py-2.5 text-right font-medium ${wasReversed ? "text-muted line-through decoration-1" : isReversal ? "text-danger" : ""}`}
                    >
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
    </Panel>
  );
}
