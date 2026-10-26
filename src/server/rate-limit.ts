// No "server-only" import: src/lib/auth.ts uses this, and auth.ts is also loaded by CLI scripts.
import { headers } from "next/headers";
import { sql } from "drizzle-orm";
import { db } from "@/db";

/*
  App rate limits, stored in Postgres (app_rate_limit) so every serverless
  instance shares the same counters. Fixed windows: simple and good enough
  to stop a script or a stolen account from flooding the app. Network-level
  floods are Vercel's job (edge DDoS protection), not this code's.

  Sign-in itself is limited by Better Auth (per IP) plus the per-username
  failure limit in src/lib/auth.ts, which uses peekLimit/hitLimit below.
*/

export const LIMITS = {
  /* Any signed-in write: post, edit, delete, RSVP, playlist, target, ... */
  write: { max: 30, windowSec: 60 },
  /* Votes are cheap to spam, so they get their own budget */
  vote: { max: 20, windowSec: 60 },
  /* Exports run the biggest queries in the app */
  export: { max: 10, windowSec: 600 },
  /* Setup/reset link redemption, per IP (tokens are unguessable; this protects the database) */
  setupLink: { max: 10, windowSec: 900 },
  /* Failed sign-ins per username, on top of Better Auth's per-IP limit */
  signInFail: { max: 5, windowSec: 900 },
} as const;

export type LimitName = keyof typeof LIMITS;

/* Count one hit. Returns how many hits are in the current window and when it resets. */
export async function hitLimit(name: LimitName, subject: string) {
  const { windowSec } = LIMITS[name];
  const key = `${name}:${subject}`.slice(0, 200);
  const rows = await db.execute<{ count: number; reset_in: number }>(sql`
    INSERT INTO app_rate_limit (key, count, window_start)
    VALUES (${key}, 1, now())
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN app_rate_limit.window_start <= now() - make_interval(secs => ${windowSec})
                   THEN 1 ELSE app_rate_limit.count + 1 END,
      window_start = CASE WHEN app_rate_limit.window_start <= now() - make_interval(secs => ${windowSec})
                   THEN now() ELSE app_rate_limit.window_start END
    RETURNING count,
      GREATEST(0, CEIL(EXTRACT(EPOCH FROM (window_start + make_interval(secs => ${windowSec}) - now()))))::int AS reset_in
  `);
  const row = rows.rows[0]!;
  return { count: Number(row.count), resetInSec: Number(row.reset_in) };
}

/* Current count without adding a hit (used to refuse sign-in before checking the password). */
export async function peekLimit(name: LimitName, subject: string) {
  const { windowSec } = LIMITS[name];
  const key = `${name}:${subject}`.slice(0, 200);
  const rows = await db.execute<{ count: number; reset_in: number }>(sql`
    SELECT count,
      GREATEST(0, CEIL(EXTRACT(EPOCH FROM (window_start + make_interval(secs => ${windowSec}) - now()))))::int AS reset_in
    FROM app_rate_limit
    WHERE key = ${key} AND window_start > now() - make_interval(secs => ${windowSec})
  `);
  const row = rows.rows[0];
  return row ? { count: Number(row.count), resetInSec: Number(row.reset_in) } : { count: 0, resetInSec: 0 };
}

export async function clearLimit(name: LimitName, subject: string) {
  await db.execute(sql`DELETE FROM app_rate_limit WHERE key = ${`${name}:${subject}`.slice(0, 200)}`);
}

const wait = (sec: number) => (sec <= 60 ? "a minute" : `${Math.ceil(sec / 60)} minutes`);

/*
  For server actions: counts one hit and returns a friendly message when the
  limit is exceeded, or null when the action may go ahead.
    const blocked = await limitAction("write", actor.id);
    if (blocked) return { ok: false, message: blocked };
*/
export async function limitAction(name: LimitName, subject: string): Promise<string | null> {
  const { count, resetInSec } = await hitLimit(name, subject);
  if (count <= LIMITS[name].max) return null;
  return `You're doing that too quickly. Please wait ${wait(resetInSec)} and try again.`;
}

/*
  Visitor IP for per-IP limits and the activity log. On Vercel,
  x-vercel-forwarded-for is set by the edge and can't be forged by the
  client; x-forwarded-for is a fallback for local development.
*/
export async function clientIp(): Promise<string> {
  const h = await headers();
  const raw = h.get("x-vercel-forwarded-for") ?? h.get("x-forwarded-for") ?? "";
  return raw.split(",")[0]?.trim() || "unknown";
}
