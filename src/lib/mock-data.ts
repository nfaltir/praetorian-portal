/*
  MOCK DATA FOR UI WORK ONLY.
  Every name, amount and event here is invented. Accounts and sign-in are
  real since step 2; the dashboard content below is replaced by database
  queries in steps 3 to 5 and must never ship to production.
*/
import type { Activity, LedgerEntry, Member, Poll, ReunionEvent, Update } from "./types";
import { site } from "@/config/site";

export const members: Member[] = [
  { id: "m01", name: "Marcus Reyes", username: "mreyes", role: "member", activated: true },
  { id: "m02", name: "Lena Ortiz", username: "lortiz", role: "chair", activated: true },
  { id: "m03", name: "Daniel Kapriel", username: "dkapriel", role: "vice_chair", activated: true },
  { id: "m04", name: "Rosa Aisek", username: "raisek", role: "treasurer", activated: true },
  { id: "m05", name: "Kevin Mori", username: "kmori", role: "treasurer", activated: true },
  { id: "m06", name: "Teresa Walter", username: "twalter", role: "member", activated: true },
  { id: "m07", name: "Paul Nakamura", username: "pnakamura", role: "member", activated: true },
  { id: "m08", name: "Joanna Billimon", username: "jbillimon", role: "member", activated: true },
  { id: "m09", name: "Samuel Hadley", username: "shadley", role: "member", activated: true },
  { id: "m10", name: "Grace Lino", username: "glino", role: "member", activated: true },
  { id: "m11", name: "Victor Ruben", username: "vruben", role: "member", activated: true },
  { id: "m12", name: "Maria Ruben", username: "mruben", role: "member", activated: true },
  { id: "m13", name: "Anthony Sipos", username: "asipos", role: "member", activated: true },
  { id: "m14", name: "Celine Moses", username: "cmoses", role: "member", activated: true },
  { id: "m15", name: "Ricky Edwin", username: "redwin", role: "member", activated: true },
  { id: "m16", name: "Nina Takeshi", username: "ntakeshi", role: "member", activated: true },
  { id: "m17", name: "Ben Hartman", username: "bhartman", role: "member", activated: true },
  { id: "m18", name: "Isabel Penno", username: "ipenno", role: "member", activated: true },
  { id: "m19", name: "Leo Santos", username: "lsantos", role: "member", activated: false },
  { id: "m20", name: "Hannah Ioanis", username: "hioanis", role: "member", activated: false },
];

/*
  Private targets in cents. Default $400.
  m11 and m12 are the couple ($200 each). m15 has a reduced target.
*/
export const targets = new Map<string, number>(
  members.map((m) => [m.id, site.defaultTargetCents]),
);
targets.set("m11", 20_000);
targets.set("m12", 20_000);
targets.set("m15", 10_000);

/*
  Everything below depends on the current time, so it is built per request
  (Cache Components forbids reading the clock during prerender).
*/
export function mockTimeline() {
  const DAY = 86_400_000;
  const ago = (days: number, hours = 0) => new Date(Date.now() - days * DAY - hours * 3_600_000).toISOString();
  const isoDate = (days: number) => ago(days).slice(0, 10);

  let seq = 0;
  const pay = (memberId: string, dollars: number, daysAgo: number, by = "m04"): LedgerEntry => ({
    id: `c${String(++seq).padStart(3, "0")}`,
    memberId,
    kind: "payment",
    amountCents: Math.round(dollars * 100),
    paidOn: isoDate(daysAgo),
    recordedAt: ago(daysAgo - 0.5),
    recordedBy: by,
  });

  const ledgerBase: LedgerEntry[] = [
    pay("m02", 400, 160),
    pay("m04", 200, 150, "m05"),
    pay("m03", 100, 140),
    pay("m06", 50, 120),
    pay("m09", 400, 110, "m05"),
    pay("m07", 25, 95),
    pay("m10", 150, 80),
    pay("m04", 200, 70, "m05"),
    pay("m11", 200, 64),
    pay("m12", 200, 64),
    pay("m13", 75, 50),
    pay("m15", 100, 45),
    pay("m06", 50, 40),
    pay("m16", 600, 33, "m05"),
    pay("m01", 60, 28),
    pay("m14", 20, 21),
    pay("m07", 25, 16),
    pay("m01", 65, 9),
    pay("m18", 50, 6),
    pay("m03", 100, 3, "m05"),
  ];

  /* A mistaken entry and its reversal, to exercise the correction path */
  const mistake = pay("m17", 500, 12);
  mistake.memo = "Entered under wrong classmate";
  const reversal: LedgerEntry = {
    id: `c${String(++seq).padStart(3, "0")}`,
    memberId: "m17",
    kind: "reversal",
    amountCents: mistake.amountCents,
    paidOn: mistake.paidOn,
    recordedAt: ago(11),
    recordedBy: "m04",
    reversesId: mistake.id,
    memo: "Reverses entry " + mistake.id,
  };

  const ledger: LedgerEntry[] = [...ledgerBase, mistake, reversal].sort(
    (a, b) => b.recordedAt.localeCompare(a.recordedAt),
  );

  const updates: Update[] = [
    {
      id: "u1",
      title: "Venue shortlist is ready for your vote",
      excerpt:
        "We visited four places over the summer and narrowed it to three. The poll is open now on the Voting page and closes at the end of the month.",
      authorId: "m02",
      publishedAt: ago(2, 3),
      category: "Announcement",
    },
    {
      id: "u2",
      title: "Class shirt design, final draft",
      excerpt:
        "Here is the final shirt design with the Praetorianz crest on the back. Send us a message through the portal before we place the order.",
      authorId: "m03",
      publishedAt: ago(4, 6),
      category: "Logistics",
    },
    {
      id: "u3",
      title: "Volunteers needed for the planning committee",
      excerpt:
        "We are looking for two or three people to help with registration and travel coordination. A few hours a month is plenty.",
      authorId: "m02",
      publishedAt: ago(8, 1),
      category: "Volunteers",
    },
  ];

  const events: ReunionEvent[] = [
    {
      id: "e1",
      title: "Planning call",
      startsAt: new Date(Date.now() + 9 * DAY).toISOString().slice(0, 11) + "02:00:00.000Z",
      endsAt: new Date(Date.now() + 9 * DAY).toISOString().slice(0, 11) + "03:30:00.000Z",
      location: "Video call, link in Updates",
      status: "confirmed",
    },
    {
      id: "e2",
      title: "Reunion kickoff dinner",
      startsAt: "2030-08-15T01:00:00.000Z",
      endsAt: "2030-08-15T05:00:00.000Z",
      location: "Venue to be decided",
      status: "tentative",
    },
    {
      id: "e3",
      title: "Farewell brunch",
      startsAt: "2030-08-17T17:00:00.000Z",
      endsAt: "2030-08-17T20:00:00.000Z",
      location: "Venue to be decided",
      status: "tentative",
    },
  ];

  const activePoll: Poll = {
    id: "p1",
    question: "Which venue do you prefer?",
    closesAt: new Date(Date.now() + 17 * DAY).toISOString(),
    resultsVisible: true,
    myVoteOptionId: "o1",
    options: [
      { id: "o1", label: "Harbor View Hotel", votes: 9 },
      { id: "o2", label: "Lakeside Inn", votes: 5 },
      { id: "o3", label: "Hillcrest Lodge", votes: 2 },
    ],
  };

  const activity: Activity[] = [
    { id: "a1", kind: "contribution", text: "Daniel Kapriel contributed $100", at: ago(3) },
    { id: "a2", kind: "update", text: "New update: Venue shortlist is ready for your vote", at: ago(2, 3) },
    { id: "a3", kind: "poll", text: "Poll opened: Which venue do you prefer?", at: ago(2, 4) },
    { id: "a4", kind: "contribution", text: "Isabel Penno contributed $50", at: ago(6) },
    { id: "a5", kind: "joined", text: "Isabel Penno joined the portal", at: ago(7) },
  ];

  return { ledger, updates, events, activePoll, activity };
}

