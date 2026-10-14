"use client";

import { useRef } from "react";
import { Menu, X } from "lucide-react";
import type { NavItem } from "@/config/nav";
import { NavLinks } from "./NavLinks";
import { SidebarIdentity } from "./Identity";

/* Native <dialog> gives focus trapping, Escape to close and a backdrop for free. */
export function MobileNav({ items, unread }: { items: NavItem[]; unread: number }) {
  const ref = useRef<HTMLDialogElement>(null);
  const close = () => ref.current?.close();

  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        className="relative -ml-2 rounded-control p-2 text-ink hover:bg-brand-tint lg:hidden"
        aria-label={unread > 0 ? `Open menu, ${unread} unread message` : "Open menu"}
      >
        <Menu size={22} aria-hidden="true" />
        {unread > 0 && <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-accent" aria-hidden="true" />}
      </button>

      <dialog
        ref={ref}
        aria-label="Main menu"
        onClick={(e) => e.target === ref.current && close()}
        className="m-0 h-dvh max-h-dvh w-[min(20rem,86vw)] max-w-none bg-brand-ink p-0 text-on-dark lg:hidden"
      >
        <div className="flex h-full flex-col">
          <div className="flex justify-end px-3 pt-3">
            <button
              type="button"
              onClick={close}
              className="rounded-control p-2 text-on-dark-muted hover:bg-on-dark-hover hover:text-on-dark"
              aria-label="Close menu"
            >
              <X size={22} aria-hidden="true" />
            </button>
          </div>
          <div className="pb-6">
            <SidebarIdentity />
          </div>
          <nav aria-label="Main" className="flex-1 overflow-y-auto pb-6">
            <NavLinks items={items} unread={unread} onNavigate={close} />
          </nav>
        </div>
      </dialog>
    </>
  );
}
