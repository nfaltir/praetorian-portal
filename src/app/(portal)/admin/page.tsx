import type { Metadata } from "next";
import Link from "next/link";
import { CircleCheck, Clock, Download, ShieldCheck, ShieldOff, UserX } from "lucide-react";
import { can, roleLabels } from "@/lib/roles";
import { requirePermission } from "@/lib/session";
import { listMembers, mayManage } from "@/server/members";
import { shortDate } from "@/lib/format";
import { Badge, Panel } from "@/components/ui/Panel";
import { AddMemberForm, MemberRowActions } from "./MemberForms";

export const metadata: Metadata = { title: "Staff Admin" };

export default async function AdminPage() {
  const actor = await requirePermission(can.manageMembers);
  const members = await listMembers();
  const active = members.filter((m) => !m.disabled);
  const joined = active.filter((m) => m.activated).length;

  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-serif text-[34px] leading-tight font-semibold">Staff Admin</h1>
          <p className="figures mt-1 text-[14px] text-muted">
            {active.length} accounts · {joined} joined · {active.length - joined} waiting on their setup link
          </p>
        </div>
        <Link
          href="/admin/exports"
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-control border border-line bg-panel px-5 text-[14px] font-medium text-ink transition-colors hover:bg-brand-tint"
        >
          <Download size={16} aria-hidden="true" /> Exports
        </Link>
      </div>

      <AddMemberForm canSetRole={can.manageRoles(actor.role)} />

      <Panel className="overflow-hidden" labelledBy="members-heading">
        <h2 id="members-heading" className="px-6 pt-5 pb-3 font-serif text-[22px] font-semibold">Members</h2>
        <ul className="divide-y divide-line border-t border-line">
          {members.map((m) => {
            const manageable = mayManage(actor, m) && m.id !== actor.id;
            return (
              <li key={m.id} className={`flex flex-col gap-3 px-6 py-4 lg:flex-row lg:items-center ${m.disabled ? "bg-page/60" : ""}`}>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className={`font-medium ${m.disabled ? "text-muted line-through" : ""}`}>{m.name}</span>
                    <span className="text-[13px] text-muted">@{m.username}</span>
                    {m.role !== "member" && (
                      <span className="rounded-full bg-accent-tint px-2 py-0.5 text-[11px] font-semibold text-ink">{roleLabels[m.role]}</span>
                    )}
                    {m.id === actor.id && <span className="text-[12px] text-muted">(you)</span>}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {m.disabled ? (
                      <Badge tone="danger" icon={UserX}>Disabled</Badge>
                    ) : m.activated ? (
                      <Badge tone="success" icon={CircleCheck}>Joined</Badge>
                    ) : m.pendingLinkExpires ? (
                      <Badge tone="warning" icon={Clock}>Link expires {shortDate(m.pendingLinkExpires.toISOString())}</Badge>
                    ) : (
                      <Badge tone="neutral" icon={Clock}>Not joined, no active link</Badge>
                    )}
                    {m.role !== "member" &&
                      (m.twoFactorEnabled ? (
                        <Badge tone="success" icon={ShieldCheck}>2FA on</Badge>
                      ) : (
                        <Badge tone="warning" icon={ShieldOff}>2FA not set up</Badge>
                      ))}
                  </div>
                </div>
                {manageable && (
                  <MemberRowActions
                    member={{ id: m.id, name: m.name, role: m.role, activated: m.activated, disabled: m.disabled }}
                    canSetRole={can.manageRoles(actor.role)}
                  />
                )}
              </li>
            );
          })}
        </ul>
      </Panel>

      <p className="text-[13px] text-muted">
        Links work once and expire after 72 hours. Issuing a new link cancels the previous one. Send links privately, never in a group chat: anyone holding a link can set that person&apos;s password.
      </p>
    </div>
  );
}

export const instant = false; // reads the session; blocks on the server by design (see (portal)/layout.tsx)
