import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Download, FileText, KeyRound, LogIn, LogOut, ShieldAlert, UserCog, Wallet } from "lucide-react";
import { site } from "@/config/site";
import { money, relativeTime } from "@/lib/format";
import { can, isRole, roleLabels } from "@/lib/roles";
import { requirePermission } from "@/lib/session";
import { ACTIVITY_FILTERS, isActivityFilter, listActivity, parseCursor, type ActivityItem } from "@/server/activity";
import { Panel } from "@/components/ui/Panel";

export const metadata: Metadata = { title: "Activity" };
export const instant = false; // reads the session; blocks on the server by design (see (portal)/layout.tsx)

/*
  Superuser only (other organizers get a 404). A read-only view of the
  audit log: sign-ins, account changes, money, content and exports.
  Everything written here comes from the log and is rendered as text.
  IP addresses are shown only on this page, to help spot unusual sign-ins.
*/

const exact = new Intl.DateTimeFormat("en-US", {
  timeZone: site.timeZone,
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const str = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));
const cents = (v: unknown) => (typeof v === "number" ? money(v) : "");
const role = (v: unknown) => (isRole(v) ? roleLabels[v] : str(v));
const RSVP = { attending: "Attending", maybe: "Maybe", not_attending: "Not attending" } as Record<string, string>;
const EXPORT = {
  updates: "Updates",
  rsvp: "RSVP list",
  playlists: "Music playlists",
  contributions: "Treasury entries",
  balances: "Treasury balances",
} as Record<string, string>;

function describe(i: ActivityItem): { icon: typeof LogIn; tone: string; text: string } {
  const who = i.actorName ?? "System";
  const them = i.targetName ?? "a former member";
  const d = i.detail ?? {};
  switch (i.action) {
    case "auth.signed_in":
      return { icon: LogIn, tone: "text-success", text: `${who} signed in` };
    case "auth.signed_out":
      return { icon: LogOut, tone: "text-muted", text: `${who} signed out` };
    case "auth.sign_in_failed": {
      const acct = d.username ? `@${str(d.username)}` : "an unknown username";
      return {
        icon: ShieldAlert,
        tone: i.count >= 5 ? "text-danger" : "text-warning",
        text: i.count > 1 ? `${i.count} failed sign-ins for ${acct}` : `Failed sign-in for ${acct}`,
      };
    }
    case "superuser.created":
      return { icon: UserCog, tone: "text-brand", text: `Superuser ${them} created from the command line` };
    case "member.created":
      return { icon: UserCog, tone: "text-brand", text: `${who} added ${them} (@${str(d.username)}) as ${role(d.role)}` };
    case "member.role_changed":
      return { icon: UserCog, tone: "text-brand", text: `${who} changed ${them}'s role from ${role(d.from)} to ${role(d.to)}` };
    case "member.disabled":
      return { icon: UserCog, tone: "text-danger", text: `${who} disabled ${them}` };
    case "member.enabled":
      return { icon: UserCog, tone: "text-brand", text: `${who} re-enabled ${them}` };
    case "link.setup_issued":
      return { icon: KeyRound, tone: "text-brand", text: `${who} issued a setup link for ${them}` };
    case "link.reset_issued":
      return { icon: KeyRound, tone: "text-brand", text: `${who} issued a password reset link for ${them}` };
    case "link.redeemed":
      return { icon: KeyRound, tone: "text-success", text: `${them} set a new password (${str(d.purpose) || "link"})` };
    case "ledger.payment_recorded":
      return { icon: Wallet, tone: "text-success", text: `${who} recorded ${cents(d.amountCents)} for ${them}, paid ${str(d.paidOn)}` };
    case "ledger.reversed":
      return { icon: Wallet, tone: "text-danger", text: `${who} reversed ${cents(d.amountCents)} for ${them}${d.reason ? `: "${str(d.reason)}"` : ""}` };
    case "member.target_changed":
      return { icon: Wallet, tone: "text-brand", text: `${who} changed ${them}'s target from ${cents(d.from)} to ${cents(d.to)}` };
    case "update.posted":
    case "update.edited":
    case "update.deleted":
      return { icon: FileText, tone: "text-brand", text: `${who} ${i.action.split(".")[1]} the update "${str(d.title)}"` };
    case "update.comment_removed":
      return { icon: FileText, tone: "text-danger", text: `${who} removed a comment by ${them}` };
    case "poll.created":
    case "poll.closed":
    case "poll.deleted":
      return { icon: FileText, tone: "text-brand", text: `${who} ${i.action.split(".")[1]} the poll "${str(d.question)}"` };
    case "playlist.created":
    case "playlist.edited":
    case "playlist.deleted":
      return { icon: FileText, tone: "text-brand", text: `${who} ${i.action === "playlist.created" ? "added" : i.action.split(".")[1]} the playlist "${str(d.title)}"` };
    case "rsvp.set": {
      const to = (d.to ?? {}) as Record<string, unknown>;
      const guests = typeof to.guests === "number" && to.guests > 0 ? ` (+${to.guests})` : "";
      return { icon: FileText, tone: "text-brand", text: `${who} set ${them}'s RSVP to ${RSVP[str(to.status)] ?? str(to.status)}${guests}` };
    }
    case "rsvp.cleared":
      return { icon: FileText, tone: "text-muted", text: `${who} cleared ${them}'s RSVP` };
    case "export.downloaded":
      return { icon: Download, tone: "text-brand", text: `${who} downloaded ${EXPORT[str(d.kind)] ?? str(d.kind)} (${str(d.rows)} rows)` };
    default:
      return { icon: FileText, tone: "text-muted", text: `${who}: ${i.action}` };
  }
}

export default async function ActivityPage({ searchParams }: PageProps<"/admin/activity">) {
  await requirePermission(can.manageRoles);
  const params = await searchParams;
  const f = typeof params.f === "string" && isActivityFilter(params.f) ? params.f : "all";
  const cursor = parseCursor(typeof params.before === "string" ? params.before : undefined);
  const { items, nextCursor } = await listActivity(f, cursor);
  const now = new Date();

  return (
    <div className="mx-auto flex max-w-[960px] flex-col gap-6">
      <div>
        <Link href="/admin" className="inline-flex items-center gap-1 text-[13px] font-medium text-brand hover:underline">
          <ArrowLeft size={14} aria-hidden="true" /> Staff Admin
        </Link>
        <h1 className="mt-2 font-serif text-[34px] leading-tight font-semibold">Activity</h1>
        <p className="mt-1 text-[14px] text-muted">
          Everything important that happens in the portal, newest first. Only you can see this page. Times are Chuuk time.
        </p>
      </div>

      <nav aria-label="Filter activity" className="flex flex-wrap gap-2">
        {(Object.keys(ACTIVITY_FILTERS) as (keyof typeof ACTIVITY_FILTERS)[]).map((k) => (
          <Link
            key={k}
            href={k === "all" ? "/admin/activity" : `/admin/activity?f=${k}`}
            aria-current={k === f ? "page" : undefined}
            className={`inline-flex h-9 items-center rounded-full border px-3.5 text-[13px] font-medium transition-colors ${
              k === f ? "border-brand bg-brand text-on-dark" : "border-line bg-panel text-ink hover:bg-brand-tint"
            }`}
          >
            {ACTIVITY_FILTERS[k].label}
          </Link>
        ))}
      </nav>

      <Panel as="div" className="overflow-hidden">
        {items.length === 0 ? (
          <p className="px-6 py-5 text-[14px] text-muted">{cursor ? "No older activity." : "No activity yet."}</p>
        ) : (
          <ul className="divide-y divide-line">
            {items.map((i) => {
              const { icon: Icon, tone, text } = describe(i);
              const d = i.detail ?? {};
              const ip = str(d.ip);
              const device = str(d.device);
              return (
                <li key={i.id} className="flex gap-3 px-4 py-3.5 sm:px-6">
                  <Icon size={17} className={`mt-0.5 shrink-0 ${tone}`} aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] break-words text-ink">{text}</p>
                    <p className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[12px] text-muted">
                      <time dateTime={i.at} title={exact.format(new Date(i.at))}>
                        {i.count > 1
                          ? `${exact.format(new Date(i.firstAt))} to ${exact.format(new Date(i.at))}`
                          : `${relativeTime(i.at, now)} · ${exact.format(new Date(i.at))}`}
                      </time>
                      {ip && <span className="figures">IP {ip}</span>}
                      {device && <span className="max-w-full truncate" title={device}>{device}</span>}
                    </p>
                    {i.detail && (
                      <details className="mt-1.5">
                        <summary className="inline-flex cursor-pointer list-none text-[12px] font-medium text-brand hover:underline [&::-webkit-details-marker]:hidden">
                          Details
                        </summary>
                        <pre className="mt-1.5 max-h-60 overflow-auto rounded-control bg-page p-3 text-[11px] leading-relaxed whitespace-pre-wrap break-all text-ink">
                          {JSON.stringify(i.detail, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      {nextCursor && (
        <div className="flex justify-center">
          <Link
            href={`/admin/activity?${new URLSearchParams({ ...(f !== "all" ? { f } : {}), before: nextCursor })}`}
            className="inline-flex h-10 items-center rounded-control border border-line bg-panel px-4 text-[13px] font-medium text-ink hover:bg-brand-tint"
          >
            Load older
          </Link>
        </div>
      )}
    </div>
  );
}
