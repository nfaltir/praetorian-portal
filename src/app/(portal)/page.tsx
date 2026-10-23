import { requireUser } from "@/lib/session";
import { site } from "@/config/site";
import { classSummary, reversedIds, totalsByMember } from "@/lib/ledger";
import type { Member } from "@/lib/types";
import { listMembers } from "@/server/members";
import { loadLedger, loadRoster } from "@/server/ledger";
import { loadUpdates } from "@/server/updates";
import { listPolls } from "@/server/polls";
import { WelcomeBanner } from "@/components/dashboard/WelcomeBanner";
import { StatCards } from "@/components/dashboard/StatCards";
import { LatestUpdates } from "@/components/dashboard/LatestUpdates";
import { OpenPolls } from "@/components/dashboard/OpenPolls";
import { ContributionProgress } from "@/components/dashboard/ContributionProgress";

export const instant = false; // reads the session; blocks on the server by design (see (portal)/layout.tsx)

/*
  Dashboard on real data.
  - Classmates and contributions come from the database.
  - Events, polls and activity are not built yet, so their side column is
    left out until they ship (SideModules.tsx keeps the components).
  - Targets are used only to compute the class goal. No individual target
    is passed to any component.
*/
export default async function HomePage() {
  const viewer = await requireUser();
  const now = new Date();

  const [allMembers, ledger, roster, updates, openPolls] = await Promise.all([
    listMembers(),
    loadLedger(),
    loadRoster(),
    loadUpdates(3),
    listPolls(viewer, { openOnly: true, limit: 3 }),
  ]);

  const members: Member[] = allMembers
    .filter((m) => !m.disabled)
    .map((m) => ({ id: m.id, name: m.name, username: m.username, role: m.role, activated: m.activated }));
  const targets = new Map(roster.map((m) => [m.id, m.targetCents]));
  const totals = totalsByMember(ledger);
  const summary = classSummary(targets, totals);

  return (
    <div className="mx-auto flex max-w-350 flex-col gap-6">
      <WelcomeBanner />

      <div className="flex min-w-0 flex-col gap-6">
        <StatCards
          joined={members.filter((m) => m.activated).length}
          added={members.length}
          summary={summary}
          nextEvent={null}
        />
        <LatestUpdates updates={updates} members={members} now={now} />
        <OpenPolls polls={openPolls} now={now} />
        <ContributionProgress
          summary={summary}
          members={members}
          totals={totals}
          recent={ledger.slice(0, 6)}
          reversed={reversedIds(ledger)}
        />
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
