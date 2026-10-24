import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Download, FileSpreadsheet } from "lucide-react";
import { can } from "@/lib/roles";
import { requirePermission } from "@/lib/session";
import { EXPORTS, type ExportKind } from "@/server/exports";
import { Panel } from "@/components/ui/Panel";

export const metadata: Metadata = { title: "Exports" };
export const instant = false; // reads the session; blocks on the server by design (see (portal)/layout.tsx)

/*
  Organizers only. Lists the CSV exports this person may download.
  The download links are plain <a download>, NOT next/link: Link prefetches,
  and prefetching a download URL would build the file and write an audit
  entry without anyone clicking.
*/
export default async function ExportsPage() {
  const viewer = await requirePermission(can.manageContent);
  const kinds = (Object.keys(EXPORTS) as ExportKind[]).filter((k) => EXPORTS[k].allowed(viewer.role));

  return (
    <div className="mx-auto flex max-w-[860px] flex-col gap-6">
      <div>
        <Link href="/admin" className="inline-flex items-center gap-1 text-[13px] font-medium text-brand hover:underline">
          <ArrowLeft size={14} aria-hidden="true" /> Staff Admin
        </Link>
        <h1 className="mt-2 font-serif text-[34px] leading-tight font-semibold">Exports</h1>
        <p className="mt-1 text-[14px] text-muted">
          Download portal data as CSV files that open in Excel or Google Sheets. Every download is logged with your name.
        </p>
      </div>

      <Panel as="div" className="divide-y divide-line">
        {kinds.map((k) => (
          <div key={k} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:px-6">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-control bg-brand-tint text-brand" aria-hidden="true">
                <FileSpreadsheet size={19} />
              </span>
              <div className="min-w-0">
                <p className="text-[15px] font-semibold">{EXPORTS[k].label}</p>
                <p className="mt-0.5 text-[13px] text-muted">{EXPORTS[k].description}</p>
              </div>
            </div>
            <a
              href={`/admin/exports/${k}`}
              download
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-control border border-line bg-panel px-4 text-[13px] font-medium text-ink transition-colors hover:bg-brand-tint"
            >
              <Download size={15} aria-hidden="true" /> Download CSV
            </a>
          </div>
        ))}
      </Panel>

      <p className="text-[12px] text-muted">
        Files can contain classmates&apos; names, payments and messages they wrote. Keep them on your own devices and
        don&apos;t post them publicly.
      </p>
    </div>
  );
}
