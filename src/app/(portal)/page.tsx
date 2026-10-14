import { requireUser } from "@/lib/session";
import { site } from "@/config/site";
import { members, mockTimeline, targets } from "@/lib/mock-data";
import { classSummary, reversedIds, totalsByMember } from "@/lib/ledger";
import { WelcomeBanner } from "@/components/dashboard/WelcomeBanner";
import { StatCards } from "@/components/dashboard/StatCards";
import { LatestUpdates } from "@/components/dashboard/LatestUpdates";
import { ContributionProgress } from "@/components/dashboard/ContributionProgress";
import { PollPreview, RecentActivity, UpcomingEvents } from "@/components/dashboard/SideModules";

export default async function HomePage() {
  await requireUser(); // per-request: also makes relative times live
  const now = new Date();
  const { ledger, updates, events, activePoll, activity } = mockTimeline();

  const totals = totalsByMember(ledger);
  const summary = classSummary(targets, totals);
  const upcoming = events
    .filter((e) => new Date(e.startsAt) > now && (e.status === "confirmed" || e.status === "tentative"))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const nextConfirmed = upcoming.find((e) => e.status === "confirmed") ?? null;
  const pollOpen = new Date(activePoll.closesAt) > now;

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-6">
      <WelcomeBanner />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,360px)]">
        <div className="flex min-w-0 flex-col gap-6">
          <StatCards
            joined={members.filter((m) => m.activated).length}
            added={members.length}
            summary={summary}
            nextEvent={nextConfirmed}
          />
          <LatestUpdates updates={updates} members={members} now={now} />
          <ContributionProgress
            summary={summary}
            members={members}
            totals={totals}
            recent={ledger.slice(0, 6)}
            reversed={reversedIds(ledger)}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <UpcomingEvents events={upcoming.slice(0, 3)} />
          {pollOpen && <PollPreview poll={activePoll} now={now} />}
          <RecentActivity items={activity} now={now} />
        </div>
      </div>

      <figure className="relative overflow-hidden rounded-panel border border-line bg-panel px-6 py-7 sm:px-10">
        <div className="absolute inset-y-0 right-0 w-1/2 opacity-60 [background-image:radial-gradient(90%_120%_at_100%_100%,var(--brand-tint),transparent)]" aria-hidden="true" />
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
