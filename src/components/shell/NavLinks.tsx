"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays, CircleDollarSign, House, Images, Landmark, Mail,
  Newspaper, Settings, ShieldCheck, Users, Vote,
} from "lucide-react";
import type { NavItem } from "@/config/nav";

const icons = {
  home: House,
  updates: Newspaper,
  contributions: CircleDollarSign,
  classmates: Users,
  events: CalendarDays,
  polls: Vote,
  treasury: Landmark,
  gallery: Images,
  messages: Mail,
  settings: Settings,
  admin: ShieldCheck,
} as const;

export function NavLinks({
  items,
  unread,
  onNavigate,
}: {
  items: NavItem[];
  unread: number;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <ul className="flex flex-col gap-0.5">
      {items.map((item) => {
        const Icon = icons[item.icon];
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        const badge = item.icon === "messages" && unread > 0 ? unread : 0;
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={[
                "relative flex items-center gap-3 px-6 py-2.5 text-[14px] transition-colors",
                active
                  ? "bg-on-dark-hover text-on-dark font-medium"
                  : "text-on-dark-muted hover:bg-on-dark-hover hover:text-on-dark",
              ].join(" ")}
            >
              {active && <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-r bg-accent" aria-hidden="true" />}
              <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
              <span className="flex-1">{item.label}</span>
              {badge > 0 && (
                <span className="figures rounded-full bg-accent px-1.5 py-px text-[11px] font-semibold text-brand-ink">
                  {badge}
                  <span className="sr-only"> unread</span>
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
