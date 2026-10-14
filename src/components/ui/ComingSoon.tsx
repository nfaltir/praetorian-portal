import { Construction } from "lucide-react";
import { requireUser } from "@/lib/session";
import { Panel } from "./Panel";

/* Temporary page body for sections not built yet. Delete with the last one. */
export async function ComingSoon({ title, planned }: { title: string; planned: string }) {
  await requireUser(); // every portal page checks the session itself
  return (
    <div className="mx-auto max-w-[1400px]">
      <h1 className="font-serif text-[34px] leading-tight font-semibold">{title}</h1>
      <Panel as="div" className="mt-6 flex items-center gap-4 p-6">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent-tint text-accent">
          <Construction size={20} aria-hidden="true" />
        </span>
        <div>
          <p className="font-medium">This page is not built yet.</p>
          <p className="text-[14px] text-muted">Planned for {planned}.</p>
        </div>
      </Panel>
    </div>
  );
}
