import "server-only";
import { cache } from "react";
import { connection } from "next/server";
import { currentMemberId, members, unreadMessages } from "./mock-data";
import type { Member } from "./types";

/*
  The one place pages ask "who is signed in?" (the Data Access Layer seam).
  Step 2 replaces the body with a Better Auth session lookup that
  redirects to /login when there is no valid session.

  It reads the request, so callers must sit inside a <Suspense> boundary
  (a loading.tsx counts). Never await it at the top level of a layout.
*/
export const getCurrentUser = cache(async (): Promise<Member> => {
  await connection(); // stands in for reading the session cookie
  const user = members.find((m) => m.id === currentMemberId);
  if (!user) throw new Error("Mock session user missing");
  return user;
});

export async function getUnreadCount(userId: string): Promise<number> {
  await connection();
  return userId ? unreadMessages : 0;
}
