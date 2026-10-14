import Link from "next/link";
import { site, classLabel } from "@/config/site";
import { Emblem } from "./Emblem";

export function SidebarIdentity() {
  return (
    <Link href="/" className="flex flex-col items-center gap-3 px-6 text-center">
      <Emblem />
      <span>
        <span className="block text-[11px] font-medium uppercase tracking-[0.18em] text-on-dark-muted">
          {site.schoolName}
        </span>
        <span className="mt-1 block font-serif text-[24px] leading-tight font-semibold text-on-dark">{site.className}</span>
        <span className="block font-serif text-[16px] italic text-accent">{classLabel}</span>
      </span>
    </Link>
  );
}
