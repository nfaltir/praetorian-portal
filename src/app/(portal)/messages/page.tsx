import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, CircleCheck, Mail } from "lucide-react";
import { can } from "@/lib/roles";
import { requireUser } from "@/lib/session";
import { relativeTime } from "@/lib/format";
import { listThreads, type ThreadSummary } from "@/server/messages";
import { Panel } from "@/components/ui/Panel";
import { NewThreadForm } from "./MessageForms";

export const metadata: Metadata = { title: "Messages" };
export const instant = false; // reads the session; blocks on the server by design (see (portal)/layout.tsx)

/*
  Classmates: their own conversations with the organizers, plus a form to start one.
  Organizers: the shared inbox of every conversation. They can also write
  to the group as themselves, so the form stays available, folded away.
*/
export default async function MessagesPage() {
  const viewer = await requireUser();
  const isOrganizer = can.manageContent(viewer.role);
  const now = new Date();
  const threads = await listThreads(viewer);
  const open = threads.filter((t) => !t.closed);
  const resolved = threads.filter((t) => t.closed);

  return (
    <div className="mx-auto flex max-w-215 flex-col gap-6">
      <div>
        <h1 className="font-serif text-[34px] leading-tight font-semibold">Messages</h1>
        <p className="mt-1 text-[14px] text-muted">
          {isOrganizer
            ? "Shared inbox: every conversation classmates have started with the organizers."
            : "Private conversations between you and the reunion organizers."}
        </p>
      </div>

      <Panel className="p-6" labelledBy="new-message-heading">
        {isOrganizer ? (
          <details>
            <summary id="new-message-heading" className="cursor-pointer font-serif text-[20px] font-semibold">
              Write to the organizers as yourself
            </summary>
            <div className="mt-4"><NewThreadForm /></div>
          </details>
        ) : (
          <>
            <h2 id="new-message-heading" className="flex items-center gap-2 font-serif text-[22px] font-semibold">
              <Mail size={19} className="text-brand" aria-hidden="true" /> New message
            </h2>
            <div className="mt-4"><NewThreadForm /></div>
          </>
        )}
      </Panel>

      <ThreadList title="Open" threads={open} isOrganizer={isOrganizer} viewerId={viewer.id} now={now}
        empty={isOrganizer ? "No open conversations." : "You haven't messaged the organizers yet."} />
      {resolved.length > 0 && (
        <ThreadList title="Resolved" threads={resolved} isOrganizer={isOrganizer} viewerId={viewer.id} now={now} />
      )}
    </div>
  );
}

function ThreadList({
  title,
  threads,
  isOrganizer,
  viewerId,
  now,
  empty,
}: {
  title: string;
  threads: ThreadSummary[];
  isOrganizer: boolean;
  viewerId: string;
  now: Date;
  empty?: string;
}) {
  const headingId = `threads-${title.toLowerCase()}`;
  return (
    <Panel className="overflow-hidden" labelledBy={headingId}>
      <h2 id={headingId} className="px-6 pt-5 pb-3 font-serif text-[22px] font-semibold">{title}</h2>
      {threads.length === 0 ? (
        <p className="border-t border-line px-6 py-5 text-[14px] text-muted">{empty}</p>
      ) : (
        <ul className="divide-y divide-line border-t border-line">
          {threads.map((t) => {
            const who = isOrganizer && t.memberId !== viewerId ? t.memberName : null;
            const waitingOn = t.lastFromStaff ? "Organizers replied" : isOrganizer ? "Awaiting reply" : "Sent";
            return (
              <li key={t.id}>
                <Link href={`/messages/${t.id}`} className="flex items-center gap-3 px-6 py-3.5 hover:bg-page">
                  <span
                    className={`size-2.5 shrink-0 rounded-full ${t.unread ? "bg-brand" : "bg-transparent"}`}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-[15px] ${t.unread ? "font-semibold" : ""}`}>
                      {t.subject}
                      {t.unread && <span className="sr-only"> (new reply)</span>}
                    </span>
                    <span className="flex flex-wrap items-center gap-x-2 text-[12px] text-muted">
                      {who && <span className="font-medium text-ink">{who}</span>}
                      <span>{t.closed ? <><CircleCheck size={12} className="-mt-0.5 inline" aria-hidden="true" /> Resolved</> : waitingOn}</span>
                      <time dateTime={t.lastMessageAt}>{relativeTime(t.lastMessageAt, now)}</time>
                    </span>
                  </span>
                  <ChevronRight size={16} className="shrink-0 text-muted" aria-hidden="true" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}