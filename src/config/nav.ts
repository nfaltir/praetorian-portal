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

export const navItems: NavItem[] = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/updates", label: "Updates", icon: "updates" },
  { href: "/contributions", label: "My Contributions", icon: "contributions" },
  { href: "/classmates", label: "Classmates", icon: "classmates" },
  { href: "/events", label: "Events", icon: "events" },
  { href: "/polls", label: "Voting & Polls", icon: "polls" },
  { href: "/treasury", label: "Treasury", icon: "treasury" },
  { href: "/gallery", label: "Gallery", icon: "gallery" },
  { href: "/messages", label: "Messages", icon: "messages" },
  { href: "/settings", label: "Settings", icon: "settings" },
  { href: "/admin", label: "Staff Admin", icon: "admin", roles: STAFF_ROLES },
];

export function navFor(role: Role): NavItem[] {
  return navItems.filter((i) => !i.roles || i.roles.includes(role));
}
