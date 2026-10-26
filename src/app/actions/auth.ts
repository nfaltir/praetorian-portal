"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getCurrentUserOrNull } from "@/lib/session";
import { audit } from "@/server/audit";

export async function signOutAction() {
  const me = await getCurrentUserOrNull();
  await auth.api.signOut({ headers: await headers() });
  if (me) await audit({ actorId: me.id, action: "auth.signed_out", targetUserId: me.id });
  redirect("/login");
}
