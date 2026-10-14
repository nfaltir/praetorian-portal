import { Suspense } from "react";
import Link from "next/link";
import { site } from "@/config/site";
import { Emblem } from "./Emblem";
import { MobileNav } from "./MobileNav";
import { AccountMenuSkeleton } from "./AccountMenu";
import { AccountSlot, MobileNavSlot, publicNav } from "./UserParts";

export function TopBar() {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-page/90 backdrop-blur lg:static lg:border-none lg:bg-transparent lg:backdrop-blur-none">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Suspense fallback={<MobileNav items={publicNav} unread={0} />}>
          <MobileNavSlot />
        </Suspense>
        <Link href="/" className="flex items-center gap-2 lg:hidden">
          <Emblem size={22} />
          <span className="font-serif text-[20px] leading-none font-semibold">{site.className}</span>
        </Link>

        <div className="flex-1" />

        <Suspense fallback={<AccountMenuSkeleton />}>
          <AccountSlot />
        </Suspense>
      </div>
    </header>
  );
}
