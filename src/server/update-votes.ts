import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { announcement, updateVote, user } from "@/db/schema";
import type { CurrentUser } from "@/lib/session";

/*
  Up and down votes on updates. Public by design: the class asked to see
  who voted which way. Any signed-in classmate may vote; one vote per
  person per update (the database enforces it). Not audit-logged: votes
  are already visible on the page, and logging every tap would bury the
  entries that matter.
*/

export class VoteError extends Error {}

export type VoteValue = 1 | -1 | 0; // 0 removes the vote

export type UpdateVotes = {
  up: number;
  down: number;
  mine: 1 | -1 | 0;
  upNames: string[];
  downNames: string[];
};

export async function castUpdateVote(actor: CurrentUser, updateId: string, value: VoteValue) {
  if (value !== 1 && value !== -1 && value !== 0) throw new VoteError("Invalid vote.");

  const exists = await db.query.announcement.findFirst({ columns: { id: true }, where: eq(announcement.id, updateId) });
  if (!exists) throw new VoteError("That update no longer exists.");

  if (value === 0) {
    await db.delete(updateVote).where(and(eq(updateVote.updateId, updateId), eq(updateVote.userId, actor.id)));
    return;
  }
  await db
    .insert(updateVote)
    .values({ updateId, userId: actor.id, value })
    .onConflictDoUpdate({
      target: [updateVote.updateId, updateVote.userId],
      set: { value, votedAt: new Date() },
    });
}

/* Counts, the viewer's own vote, and voter names (oldest vote first) for each update */
export async function loadUpdateVotes(updateIds: string[], viewerId: string): Promise<Map<string, UpdateVotes>> {
  const out = new Map<string, UpdateVotes>(
    updateIds.map((id) => [id, { up: 0, down: 0, mine: 0, upNames: [], downNames: [] }]),
  );
  if (updateIds.length === 0) return out;

  const rows = await db
    .select({ updateId: updateVote.updateId, userId: updateVote.userId, value: updateVote.value, name: user.name })
    .from(updateVote)
    .innerJoin(user, eq(user.id, updateVote.userId))
    .where(and(inArray(updateVote.updateId, updateIds), eq(user.disabled, false)))
    .orderBy(asc(updateVote.votedAt));

  for (const r of rows) {
    const v = out.get(r.updateId);
    if (!v) continue;
    if (r.value === 1) {
      v.up += 1;
      v.upNames.push(r.name);
    } else {
      v.down += 1;
      v.downNames.push(r.name);
    }
    if (r.userId === viewerId) v.mine = r.value === 1 ? 1 : -1;
  }
  return out;
}
