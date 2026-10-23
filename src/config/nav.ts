import type { Role } from "@/lib/roles";

export type NavItem = {
  href: string;
  label: string;
  icon:
    | "home" | "updates" | "contributions" | "classmates" | "events"
    | "polls" | "treasury" | "gallery" | "messages" | "settings" | "admin";
  /* Omit for everyone. Hiding a link is cosmetic: every page and action
     also checks the role on the server. */
  roles?: Role[];
};

export const STAFF_ROLES: Role[] = ["chair", "vice_chair", "treasurer", "superuser"];

/*
  Hidden for launch (pages not built yet). Uncomment a line when its page ships:
  { href: "/classmates", label: "Classmates", icon: "classmates" },
  { href: "/events", label: "Events", icon: "events" },
  { href: "/gallery", label: "Gallery", icon: "gallery" },
*/
export const navItems: NavItem[] = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/updates", label: "Updates", icon: "updates" },
  { href: "/polls", label: "Polls", icon: "polls" },
  { href: "/contributions", label: "My Contributions", icon: "contributions" },
  { href: "/treasury", label: "Treasury", icon: "treasury" },
  { href: "/messages", label: "Messages", icon: "messages" },
  { href: "/settings", label: "Settings", icon: "settings" },
  { href: "/admin", label: "Staff Admin", icon: "admin", roles: STAFF_ROLES },
];

export function navFor(role: Role): NavItem[] {
  return navItems.filter((i) => !i.roles || i.roles.includes(role));
}