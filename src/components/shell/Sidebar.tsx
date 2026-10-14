import { Suspense } from "react";
import { site } from "@/config/site";
import { SidebarIdentity } from "./Identity";
import { NavLinks } from "./NavLinks";
import { SchoolSketch } from "./SchoolSketch";
import { SidebarNav, publicNav } from "./UserParts";

export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col bg-brand-ink lg:flex">
      <div className="pt-8 pb-7">
        <SidebarIdentity />
      </div>
      <nav aria-label="Main" className="flex-1 overflow-y-auto">
        <Suspense fallback={<NavLinks items={publicNav} unread={0} />}>
          <SidebarNav />
        </Suspense>
      </nav>
      {/* Decoration gives way to navigation on short screens */}
      <div className="px-6 pb-6 [@media(max-height:860px)]:hidden">
        <p className="mb-4 font-serif text-[18px] italic leading-snug text-on-dark-muted">
          {site.sidebarQuote.map((line) => (
            <span key={line} className="block">{line}</span>
          ))}
        </p>
        <SchoolSketch />
      </div>
    </aside>
  );
}
