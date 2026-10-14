import { navFor, navItems } from "@/config/nav";
import { getCurrentUserOrNull, getUnreadCount } from "@/lib/session";
import { NavLinks } from "./NavLinks";
import { MobileNav } from "./MobileNav";
import { AccountMenu } from "./AccountMenu";

/*
  Shell pieces that depend on the signed-in user. Each streams in behind
  its own <Suspense> so the sidebar and header frame render instantly.

  These only READ the user and never redirect: access is enforced by each
  page (requireUser / requirePermission). Redirecting from shared chrome
  would loop on the very page a redirect points to.
*/

/* Static fallback: links every member has, no badges */
export const publicNav = navItems.filter((i) => !i.roles);

async function userNav() {
  const user = await getCurrentUserOrNull();
  if (!user) return { user, items: publicNav, unread: 0 };
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
  const user = await getCurrentUserOrNull();
  return user ? <AccountMenu user={user} /> : null;
}
