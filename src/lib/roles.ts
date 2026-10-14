/*
  Roles are defined in code on purpose: adding one is a reviewed change,
  not something an admin can invent from the UI.
  Every check below runs on the server. Hiding UI is never the protection.
*/

export const ROLES = ["member", "chair", "vice_chair", "treasurer", "superuser"] as const;
export type Role = (typeof ROLES)[number];

export const roleLabels: Record<Role, string> = {
  member: "Classmate",
  chair: "Chair",
  vice_chair: "Vice Chair",
  treasurer: "Treasurer",
  superuser: "Developer",
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

const STAFF: readonly Role[] = ["chair", "vice_chair", "treasurer", "superuser"];

export const can = {
  /* Staff area, member list, setup and reset links */
  manageMembers: (r: Role) => STAFF.includes(r),
  /* Updates, events, polls, gallery */
  manageContent: (r: Role) => STAFF.includes(r),
  /* Record and reverse contributions, change targets */
  manageLedger: (r: Role) => r === "treasurer" || r === "superuser",
  /* Change anyone's role, export data */
  manageRoles: (r: Role) => r === "superuser",
  /* Staff accounts must have 2FA before they can do anything */
  requiresTwoFactor: (r: Role) => STAFF.includes(r),
} as const;

export function isStaff(r: Role) {
  return STAFF.includes(r);
}
