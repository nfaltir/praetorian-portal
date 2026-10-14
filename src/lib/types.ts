import type { Role } from "./roles";
export type { Role } from "./roles";
export { roleLabels } from "./roles";

export type Member = {
  id: string;
  name: string;
  username: string;
  role: Role;
  /* false until the member has used their setup link */
  activated: boolean;
};

/*
  Ledger entry. Amounts are integer cents.
  Entries are never edited: a mistake is corrected with a "reversal"
  entry that points at the original, plus a new correct entry.
*/
export type LedgerEntry = {
  id: string;
  memberId: string;
  kind: "payment" | "reversal";
  amountCents: number;
  paidOn: string; // ISO date of the bank payment
  recordedAt: string; // ISO timestamp
  recordedBy: string; // member id of treasurer
  reversesId?: string;
  memo?: string;
};

export type Update = {
  id: string;
  title: string;
  excerpt: string;
  authorId: string;
  publishedAt: string;
  category?: "Announcement" | "Logistics" | "Events" | "Fundraising" | "Volunteers";
};

export type ReunionEvent = {
  id: string;
  title: string;
  startsAt: string;
  endsAt?: string;
  location: string;
  status: "tentative" | "confirmed" | "completed" | "cancelled";
};

export type Poll = {
  id: string;
  question: string;
  closesAt: string;
  resultsVisible: boolean;
  options: { id: string; label: string; votes: number }[];
  myVoteOptionId: string | null;
};

export type Activity = {
  id: string;
  kind: "update" | "contribution" | "joined" | "poll" | "event";
  text: string;
  at: string;
};
