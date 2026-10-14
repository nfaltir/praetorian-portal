import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "./auth";
import { can, isRole, type Role } from "./roles";

/*
  Data Access Layer: the only place that answers "who is signed in?".
  Every page and server action calls requireUser() (or requirePermission)
  before touching data. The proxy only redirects; it is not security.

  These read the request, so callers must sit inside a <Suspense>
  boundary (a loading.tsx counts). Never await them at the top level
  of a layout.
*/

export type CurrentUser = {
  id: string;
  name: string;
  username: string;
  role: Role;
  twoFactorEnabled: boolean;
};

const readSession = cache(async () => auth.api.getSession({ headers: await headers() }));

export const getCurrentUserOrNull = cache(async (): Promise<CurrentUser | null> => {
  const session = await readSession();
  if (!session) return null;
  const u = session.user;
  if (u.disabled) return null;
  return {
    id: u.id,
    name: u.name,
    username: u.username ?? "",
    role: isRole(u.role) ? u.role : "member", // unknown role gets the least access
    twoFactorEnabled: Boolean(u.twoFactorEnabled),
  };
});

/*
  Staff accounts without 2FA are sent to set it up before anything else.
  Only the security settings page passes allowMissingTwoFactor.
*/
export async function requireUser(opts?: { allowMissingTwoFactor?: boolean }): Promise<CurrentUser> {
  const user = await getCurrentUserOrNull();
  if (!user) redirect("/login");
  if (!opts?.allowMissingTwoFactor && can.requiresTwoFactor(user.role) && !user.twoFactorEnabled) {
    redirect("/settings/security?required=2fa");
  }
  return user;
}

/* 404 rather than 403, so the existence of staff pages isn't confirmed. */
export async function requirePermission(check: (role: Role) => boolean): Promise<CurrentUser> {
  const user = await requireUser();
  if (!check(user.role)) notFound();
  return user;
}


export async function getUnreadCount(userId: string): Promise<number> {
  void userId;
  return 0; // Messages arrive in step 6
}
