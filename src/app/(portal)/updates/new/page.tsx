import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { UPDATE_CATEGORIES } from "@/db/schema";
import { can } from "@/lib/roles";
import { requirePermission } from "@/lib/session";
import { NewUpdateForm } from "../UpdateForms";

export const metadata: Metadata = { title: "New update" };
export const instant = false; // reads the session; blocks on the server by design (see (portal)/layout.tsx)

/*
  Organizers only. requirePermission 404s everyone else, and the create
  action re-checks the role on the server.
*/
export default async function NewUpdatePage() {
  await requirePermission(can.manageContent);

  return (
    <div className="mx-auto flex max-w-[860px] flex-col gap-6">
      <div>
        <Link href="/updates" className="inline-flex items-center gap-1 text-[13px] font-medium text-brand hover:underline">
          <ArrowLeft size={14} aria-hidden="true" /> All updates
        </Link>
        <h1 className="mt-2 font-serif text-[34px] leading-tight font-semibold">New update</h1>
        <p className="mt-1 text-[14px] text-muted">Every classmate can read it once it&apos;s posted.</p>
      </div>
      <NewUpdateForm categories={UPDATE_CATEGORIES} />
    </div>
  );
}
