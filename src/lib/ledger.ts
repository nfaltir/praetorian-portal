import type { LedgerEntry } from "./types";

/*
  Contribution math. Pure functions, no I/O, so the same code runs
  against mock data now and database rows later.

  Rules (agreed):
  - Every recorded payment counts immediately. No pending state.
  - A reversal cancels the payment it points at. Nothing is edited or deleted.
  - Each member has a private target (default $400). Class goal = sum of targets.
  - Giving above target is allowed and counts toward the class total.
  - Remaining values never go below zero; overpayment is reported separately.
*/

/** Net contributed per member, in cents. */
export function totalsByMember(entries: LedgerEntry[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const e of entries) {
    const sign = e.kind === "payment" ? 1 : -1;
    totals.set(e.memberId, (totals.get(e.memberId) ?? 0) + sign * e.amountCents);
  }
  return totals;
}

/** Payment ids that have been reversed. */
export function reversedIds(entries: LedgerEntry[]): Set<string> {
  return new Set(
    entries.filter((e) => e.kind === "reversal" && e.reversesId).map((e) => e.reversesId!),
  );
}

export type ClassSummary = {
  goalCents: number;
  collectedCents: number;
  remainingCents: number;
  overTargetCents: number;
  percent: number; // 0..100+, of goal
  contributorCount: number;
};

export function classSummary(
  targets: Map<string, number>,
  totals: Map<string, number>,
): ClassSummary {
  let goal = 0;
  let collected = 0;
  let over = 0;
  let contributors = 0;

  for (const [memberId, target] of targets) {
    const given = Math.max(0, totals.get(memberId) ?? 0);
    goal += target;
    collected += given;
    over += Math.max(0, given - target);
    if (given > 0) contributors += 1;
  }

  return {
    goalCents: goal,
    collectedCents: collected,
    remainingCents: Math.max(0, goal - collected),
    overTargetCents: over,
    percent: goal > 0 ? (collected / goal) * 100 : 0,
    contributorCount: contributors,
  };
}

export type MemberProgress = {
  targetCents: number;
  givenCents: number;
  remainingCents: number;
  overTargetCents: number;
  percent: number;
};

export function memberProgress(targetCents: number, givenCents: number): MemberProgress {
  const given = Math.max(0, givenCents);
  return {
    targetCents,
    givenCents: given,
    remainingCents: Math.max(0, targetCents - given),
    overTargetCents: Math.max(0, given - targetCents),
    percent: targetCents > 0 ? (given / targetCents) * 100 : 0,
  };
}
