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
  superuser: "Admin",
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
  /* Change classmates' targets. Targets are public (agreed by the class);
     any organizer may adjust one, and every change is audit-logged. */
  manageTargets: (r: Role) => STAFF.includes(r),
  /* Change anyone's role, export data */
  manageRoles: (r: Role) => r === "superuser",
  /*
    Only the superuser must have 2FA (it can change roles and reach
    everything). Other staff and classmates may turn it on in Settings,
    but aren't forced to, to keep sign-in simple for the class.
    Ledger changes stay safe without it: entries are append-only and
    every change is in the audit log with who made it.
  */
  requiresTwoFactor: (r: Role) => r === "superuser",
} as const;

export function isStaff(r: Role) {
  return STAFF.includes(r);
}
