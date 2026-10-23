import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { can } from "@/lib/roles";
import { requirePermission } from "@/lib/session";
import { NewPollForm } from "../PollForms";

export const metadata: Metadata = { title: "New poll" };
export const instant = false; // reads the session; blocks on the server by design (see (portal)/layout.tsx)

/*
  Organizers only. requirePermission 404s everyone else, and the create
  action re-checks the role on the server, so hiding the button on
  /polls is only for tidiness, not security.
*/
export default async function NewPollPage() {
  await requirePermission(can.manageContent);

  return (
    <div className="mx-auto flex max-w-[860px] flex-col gap-6">
      <div>
        <Link href="/polls" className="inline-flex items-center gap-1 text-[13px] font-medium text-brand hover:underline">
          <ArrowLeft size={14} aria-hidden="true" /> All polls
        </Link>
        <h1 className="mt-2 font-serif text-[34px] leading-tight font-semibold">New poll</h1>
        <p className="mt-1 text-[14px] text-muted">Once posted, every classmate can see it and vote.</p>
      </div>
      <NewPollForm timeZoneLabel="Chuuk time" />
    </div>
  );
}
