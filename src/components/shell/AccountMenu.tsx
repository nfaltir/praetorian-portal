import Link from "next/link";
import { ChevronDown, LogOut, Settings } from "lucide-react";
import type { Member } from "@/lib/types";
import { roleLabels } from "@/lib/types";
import { initials } from "@/lib/format";

/* <details> keeps the menu working without JavaScript. */
export function AccountMenu({ user }: { user: Member }) {
  return (
    <details className="group relative">
      <summary className="flex cursor-pointer list-none items-center gap-2.5 rounded-full py-1 pr-2 pl-1 hover:bg-panel [&::-webkit-details-marker]:hidden">
        <span className="grid size-9 place-items-center rounded-full bg-brand text-[13px] font-semibold text-on-dark" aria-hidden="true">
          {initials(user.name)}
        </span>
        <span className="hidden text-left sm:block">
          <span className="block text-[14px] font-medium leading-tight">{user.name}</span>
          <span className="block text-[12px] leading-tight text-muted">{roleLabels[user.role]}</span>
        </span>
        <ChevronDown size={16} className="text-muted transition-transform group-open:rotate-180" aria-hidden="true" />
        <span className="sr-only">Account menu</span>
      </summary>
      <div className="absolute right-0 z-30 mt-2 w-52 overflow-hidden rounded-control border border-line bg-panel py-1 shadow-lg shadow-brand-ink/5">
        <div className="border-b border-line px-4 py-2.5 sm:hidden">
          <p className="text-[14px] font-medium">{user.name}</p>
          <p className="text-[12px] text-muted">@{user.username}</p>
        </div>
        <Link href="/settings" className="flex items-center gap-2.5 px-4 py-2.5 text-[14px] hover:bg-brand-tint">
          <Settings size={16} aria-hidden="true" /> Settings
        </Link>
        {/* Becomes a server action that ends the session in step 2 */}
        <button type="button" disabled className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[14px] text-muted">
          <LogOut size={16} aria-hidden="true" /> Sign out
        </button>
      </div>
    </details>
  );
}

export function AccountMenuSkeleton() {
  return (
    <div className="flex items-center gap-2.5 py-1 pl-1" aria-hidden="true">
      <span className="size-9 rounded-full bg-line" />
      <span className="hidden h-3 w-24 rounded bg-line sm:block" />
    </div>
  );
}
