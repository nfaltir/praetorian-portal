import { navFor, navItems } from "@/config/nav";
import { getCurrentUser, getUnreadCount } from "@/lib/session";
import { NavLinks } from "./NavLinks";
import { MobileNav } from "./MobileNav";
import { AccountMenu } from "./AccountMenu";

/*
  Shell pieces that depend on the signed-in user. Each streams in behind
  its own <Suspense> so the sidebar and header frame render instantly.
*/

/* Static fallback: links every member has, no badges */
export const publicNav = navItems.filter((i) => !i.roles);

async function userNav() {
  const user = await getCurrentUser();
  const unread = await getUnreadCount(user.id);
  return { user, items: navFor(user.role), unread };
}

export async function SidebarNav() {
  const { items, unread } = await userNav();
  return <NavLinks items={items} unread={unread} />;
}

export async function MobileNavSlot() {
  const { items, unread } = await userNav();
  return <MobileNav items={items} unread={unread} />;
}

export async function AccountSlot() {
  const user = await getCurrentUser();
  return <AccountMenu user={user} />;
}
