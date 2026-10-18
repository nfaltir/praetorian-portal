import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CircleCheck } from "lucide-react";
import { can } from "@/lib/roles";
import { requireUser } from "@/lib/session";
import { longDate, relativeTime } from "@/lib/format";
import { loadThread, markRead } from "@/server/messages";
import { Panel } from "@/components/ui/Panel";
import { CloseThreadButton, ReplyForm } from "../MessageForms";

export const metadata: Metadata = { title: "Message" };
export const instant = false; // reads the session; blocks on the server by design (see (portal)/layout.tsx)

/*
  One conversation. A thread the viewer may not see is a plain 404, the
  same as one that doesn't exist, so ids can't be probed.
  Message text is rendered as plain text (React escapes it), never HTML.
*/
export default async function ThreadPage({ params }: PageProps<"/messages/[id]">) {
  const viewer = await requireUser();
  const { id } = await params;
  const thread = await loadThread(viewer, id.slice(0, 64));
  if (!thread) notFound();

  // Opening the conversation marks it read for this side
  if (thread.unread) await markRead(viewer, thread.id);

  const isOrganizer = can.manageContent(viewer.role);
  const now = new Date();

  return (
    <div className="mx-auto flex max-w-215 flex-col gap-6">
      <div>
        <Link href="/messages" className="inline-flex items-center gap-1 text-[13px] font-medium text-brand hover:underline">
          <ArrowLeft size={14} aria-hidden="true" /> All messages
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-serif text-[30px] leading-tight font-semibold wrap-break-word">{thread.subject}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[13px] text-muted">
              {isOrganizer && thread.memberId !== viewer.id && (
                <span>From <span className="font-medium text-ink">{thread.memberName}</span></span>
              )}
              {thread.closed && (
                <span className="inline-flex items-center gap-1 text-success">
                  <CircleCheck size={13} aria-hidden="true" /> Resolved
                </span>
              )}
            </p>
          </div>
          {isOrganizer && thread.memberId !== viewer.id && (
            <CloseThreadButton threadId={thread.id} closed={thread.closed} />
          )}
        </div>
      </div>

      <ol className="flex flex-col gap-3" aria-label="Conversation">
        {thread.messages.map((m) => (
          <li key={m.id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
            <article
              className={`max-w-[85%] rounded-panel border px-4 py-3 ${
                m.fromStaff ? "border-brand/20 bg-brand-tint" : "border-line bg-panel"
              }`}
            >
              <p className="flex flex-wrap items-center gap-x-2 text-[12px] text-muted">
                <span className="font-medium text-ink">{m.mine ? "You" : m.authorName}</span>
                {m.fromStaff && <span>Organizer</span>}
                <time dateTime={m.createdAt} title={longDate(m.createdAt)}>{relativeTime(m.createdAt, now)}</time>
              </p>
              <p className="mt-1 text-[15px] leading-relaxed wrap-break-word whitespace-pre-line">{m.body}</p>
            </article>
          </li>
        ))}
      </ol>

      <Panel className="p-6">
        <ReplyForm threadId={thread.id} closed={thread.closed} />
      </Panel>
    </div>
  );
}