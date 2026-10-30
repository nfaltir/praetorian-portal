import type { Metadata } from "next";
import { Gift, Users, UtensilsCrossed } from "lucide-react";
import { can } from "@/lib/roles";
import { requireUser } from "@/lib/session";
import { initials } from "@/lib/format";
import { loadRsvpBoard, MAX_GUESTS, type RsvpEntry } from "@/server/rsvp";
import { Panel } from "@/components/ui/Panel";
import { EditRsvpForm } from "./RsvpForms";

export const metadata: Metadata = { title: "Classmates" };
export const instant = false; // reads the session; blocks on the server by design (see (portal)/layout.tsx)

/*
  Class directory with RSVPs. Everyone sees every classmate's status,
  guests and what they're bringing. Only organizers see the edit
  controls, and the actions re-check the role on the server.
  Names and RSVP only: no contact details are shown here.
*/

/*
  Each group gets its own tint so the list reads at a glance.
  Full class strings (not built from pieces) so Tailwind can find them.
*/
const groups = [
  {
    key: "attending",
    title: "Attending",
    dot: "bg-emerald-500",
    card: "border-emerald-200/80 bg-linear-to-br from-emerald-50 via-white to-teal-50 divide-emerald-100",
    avatar: "from-emerald-200 to-teal-200 text-emerald-950",
  },
  {
    key: "maybe",
    title: "Maybe",
    dot: "bg-amber-500",
    card: "border-amber-200/80 bg-linear-to-br from-amber-50 via-white to-yellow-50 divide-amber-100",
    avatar: "from-amber-200 to-yellow-200 text-amber-950",
  },
  {
    key: "not_attending",
    title: "Not attending",
    dot: "bg-rose-400",
    card: "border-rose-200/70 bg-linear-to-br from-rose-50 via-white to-slate-50 divide-rose-100",
    avatar: "from-rose-100 to-slate-200 text-slate-700",
  },
  {
    key: null,
    title: "Not replied yet",
    dot: "bg-slate-300",
    card: "border-line bg-panel divide-line",
    avatar: "from-slate-100 to-slate-200 text-slate-600",
  },
] as const;

export default async function ClassmatesPage() {
  const viewer = await requireUser();
  const isOrganizer = can.manageMembers(viewer.role);
  const { entries, totals } = await loadRsvpBoard();

  const stats = [
    { label: "Attending", value: totals.attending, tone: "text-emerald-700" },
    { label: "Maybe", value: totals.maybe, tone: "text-amber-700" },
    { label: "Not attending", value: totals.notAttending, tone: "text-rose-700" },
    { label: "Not replied", value: totals.noReply, tone: "text-muted" },
  ];

  return (
    <div className="mx-auto flex max-w-[860px] flex-col gap-6">
      <div>
        <h1 className="font-serif text-[34px] leading-tight font-semibold">Classmates</h1>
        <p className="mt-1 text-[14px] text-muted">
          Who&apos;s coming to the reunion. {isOrganizer ? "Record RSVPs as classmates reply." : "Organizers keep this list up to date."}
        </p>
        <div className="mt-3 flex max-w-[680px] items-start gap-2.5 rounded-control border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[12px] leading-relaxed text-amber-950">
          <UtensilsCrossed size={16} className="mt-0.5 shrink-0 text-amber-700" aria-hidden="true" />
          <p>
            <span className="font-semibold">Note:</span> &ldquo;Bringing&rdquo; items are food and legal drinks for the
            reunion. Anything listed that is not, or that sounds over the top, is a joke between classmates and is not
            actually being brought.
          </p>
        </div>
      </div>

      <Panel className="p-5 sm:p-6" labelledBy="rsvp-summary">
        <h2 id="rsvp-summary" className="sr-only">RSVP summary</h2>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label}>
              <dt className="text-[12px] font-medium text-muted">{s.label}</dt>
              <dd className={`figures font-serif text-[32px] leading-tight font-semibold ${s.tone}`}>{s.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 flex items-center gap-2 border-t border-line pt-4 text-[14px]">
          <Users size={16} className="text-brand" aria-hidden="true" />
          <span>
            Expected headcount: <strong className="figures font-semibold">{totals.headcount}</strong>
            <span className="text-muted">
              {" "}({totals.attending} {totals.attending === 1 ? "classmate" : "classmates"} + {totals.guests} {totals.guests === 1 ? "guest" : "guests"})
            </span>
          </span>
        </p>
      </Panel>

      {groups.map((g, i) => {
        const list = entries.filter((e) => e.status === g.key);
        if (list.length === 0) return null;
        return (
          <section key={g.title} aria-labelledby={`rsvp-group-${i}`} className="flex flex-col gap-3">
            <h2 id={`rsvp-group-${i}`} className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-muted">
              <span className={`size-2 rounded-full ${g.dot}`} aria-hidden="true" />
              {g.title} <span className="figures">({list.length})</span>
            </h2>
            <div className={`divide-y rounded-panel border shadow-[0_1px_2px_rgb(15_30_50/0.04)] ${g.card}`}>
              {list.map((e) => (
                <Row key={e.userId} entry={e} avatar={g.avatar} isOrganizer={isOrganizer} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function Row({ entry: e, avatar, isOrganizer }: { entry: RsvpEntry; avatar: string; isOrganizer: boolean }) {
  return (
    <div className="px-4 py-3.5 sm:px-5">
      <div className="flex items-center gap-3">
        <span
          className={`grid size-10 shrink-0 place-items-center rounded-full bg-linear-to-br text-[13px] font-semibold ${avatar}`}
          aria-hidden="true"
        >
          {initials(e.name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[15px] font-medium capitalize">{e.name}</span>
            {e.status === "attending" && e.guests > 0 && (
              <span className="figures rounded-full bg-emerald-100 px-2 py-0.5 text-[12px] font-medium text-emerald-800">
                +{e.guests} {e.guests === 1 ? "guest" : "guests"}
              </span>
            )}
          </p>
          {e.bringing && (
            <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-muted">
              <Gift size={13} className="shrink-0 text-[#9b2226]" aria-hidden="true" />
              <span className="min-w-0 break-words">Bringing {e.bringing}</span>
            </p>
          )}
        </div>
      </div>
      {isOrganizer && (
        <div className="mt-2 pl-13">
          <EditRsvpForm key={e.updatedAt ?? "none"} entry={e} maxGuests={MAX_GUESTS} />
        </div>
      )}
    </div>
  );
}
