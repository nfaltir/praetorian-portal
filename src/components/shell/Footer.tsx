import { site, classLabel } from "@/config/site";

/*
  Site footer: portal pages, sign-in pages and the public landing page.
  Static text only, no data: it also appears on public pages.
  No new Date() here: on statically rendered pages (the landing page)
  Next.js treats reading the clock as dynamic and errors.
*/
export function Footer({ className = "" }: { className?: string }) {
  return (
    <footer className={`border-t border-line/80 text-[12px] text-muted ${className}`}>
      <div className="mx-auto flex max-w-[1100px] flex-col gap-1.5 px-4 py-6 sm:flex-row sm:items-start sm:justify-between sm:gap-6 sm:px-6">
        <div>
          <p className="font-medium text-ink">
            {site.className} · {site.schoolName} {classLabel}
          </p>
          <p className="mt-0.5">Private portal for classmates. Questions? Message an organizer or ask in our Facebook group.</p>
        </div>
        <p className="shrink-0 sm:text-right">
          © {site.className} · Built by {site.builtBy}
        </p>
      </div>
    </footer>
  );
}
