import { requireUser } from "@/lib/session";
import { site } from "@/config/site";
import { classSummary, reversedIds, totalsByMember } from "@/lib/ledger";
import type { Member } from "@/lib/types";
import { listMembers } from "@/server/members";
import { loadLedger, loadRoster } from "@/server/ledger";
import { WelcomeBanner } from "@/components/dashboard/WelcomeBanner";
import { StatCards } from "@/components/dashboard/StatCards";
import { LatestUpdates } from "@/components/dashboard/LatestUpdates";
import { ContributionProgress } from "@/components/dashboard/ContributionProgress";
import { UpcomingEvents } from "@/components/dashboard/SideModules";

export const instant = false; // reads the session; blocks on the server by design (see (portal)/layout.tsx)

/*
  Dashboard on real data.
  - Classmates and contributions come from the database.
  - Updates, events, polls and activity are built in later steps; until
    then their panels show empty states instead of sample content.
  - Targets are used only to compute the class goal. No individual target
    is passed to any component.
*/
export default async function HomePage() {
  await requireUser();
  const now = new Date();

  const [allMembers, ledger, roster] = await Promise.all([listMembers(), loadLedger(), loadRoster()]);

  const members: Member[] = allMembers
    .filter((m) => !m.disabled)
    .map((m) => ({ id: m.id, name: m.name, username: m.username, role: m.role, activated: m.activated }));
  const targets = new Map(roster.map((m) => [m.id, m.targetCents]));
  const totals = totalsByMember(ledger);
  const summary = classSummary(targets, totals);

  return (
    <div className="mx-auto flex max-w-350 flex-col gap-6">
      <WelcomeBanner />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,360px)]">
        <div className="flex min-w-0 flex-col gap-6">
          <StatCards
            joined={members.filter((m) => m.activated).length}
            added={members.length}
            summary={summary}
            nextEvent={null}
          />
          <LatestUpdates updates={[]} members={members} now={now} />
          <ContributionProgress
            summary={summary}
            members={members}
            totals={totals}
            recent={ledger.slice(0, 6)}
            reversed={reversedIds(ledger)}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <UpcomingEvents events={[]} />
        </div>
      </div>

      <figure className="relative overflow-hidden rounded-panel border border-line bg-panel px-6 py-7 sm:px-10">
        <div className="absolute inset-y-0 right-0 w-1/2 opacity-60 bg-[radial-gradient(90%_120%_at_100%_100%,var(--brand-tint),transparent)]" aria-hidden="true" />
        <blockquote className="relative font-serif text-[19px] italic leading-snug sm:text-[21px]">
          {site.footerQuote.map((line) => (
            <span key={line} className="block">{line}</span>
          ))}
        </blockquote>
        <div className="relative mt-4 h-px w-12 bg-accent" aria-hidden="true" />
      </figure>
    </div>
  );
}