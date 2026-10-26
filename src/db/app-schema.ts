import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

/*
  One-time links staff send to classmates.
  - purpose "setup": first password for a new account
  - purpose "reset": staff-issued password reset
  Only a SHA-256 hash of the token is stored, so a database leak or export
  never exposes a usable link. Each link works once and expires.
*/
export const setupToken = pgTable(
  "setup_token",
  {
    id: text("id").primaryKey(),
    tokenHash: text("token_hash").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    purpose: text("purpose", { enum: ["setup", "reset"] }).notNull(),
    createdBy: text("created_by"), // null when created by the CLI script
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("setup_token_hash_idx").on(t.tokenHash), index("setup_token_user_idx").on(t.userId)],
);

/*
  Append-only record of significant actions. Never updated or deleted
  (enforced with a database trigger in the migration).
*/
export const auditLog = pgTable(
  "audit_log",
  {
    id: text("id").primaryKey(),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
    actorId: text("actor_id"), // null for system or CLI actions
    action: text("action").notNull(),
    targetUserId: text("target_user_id"),
    detail: jsonb("detail").$type<Record<string, unknown>>(),
  },
  (t) => [index("audit_log_at_idx").on(t.at), index("audit_log_target_idx").on(t.targetUserId)],
);

/*
  The contribution ledger. One row per bank payment a treasurer records.

  Rules enforced by the database itself, not just the app:
  - Amounts are positive integer cents, at most $100,000 per entry.
  - Rows are never edited or deleted (trigger in the next migration).
    A mistake is fixed with a "reversal" row pointing at the original,
    then a new correct "payment" row.
  - A reversal must point at an entry; a payment must not.
  - Each entry can be reversed at most once (unique reverses_id).
  - Members and recorders can't be deleted while they have entries
    (ON DELETE RESTRICT), so money history can't vanish with an account.
*/
export const contribution = pgTable(
  "contribution",
  {
    id: text("id").primaryKey(),
    memberId: text("member_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    kind: text("kind", { enum: ["payment", "reversal"] }).notNull(),
    amountCents: integer("amount_cents").notNull(),
    paidOn: date("paid_on").notNull(), // date on the bank record
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
    recordedBy: text("recorded_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    reversesId: text("reverses_id").references((): AnyPgColumn => contribution.id, { onDelete: "restrict" }),
    memo: text("memo"),
  },
  (t) => [
    check("contribution_amount_range", sql`${t.amountCents} > 0 AND ${t.amountCents} <= 10000000`),
    check(
      "contribution_reversal_link",
      sql`(${t.kind} = 'reversal') = (${t.reversesId} IS NOT NULL)`,
    ),
    check("contribution_memo_length", sql`${t.memo} IS NULL OR char_length(${t.memo}) <= 200`),
    uniqueIndex("contribution_reverses_once_idx").on(t.reversesId),
    index("contribution_member_idx").on(t.memberId),
    index("contribution_recorded_at_idx").on(t.recordedAt),
  ],
);


/*
  Class updates (news posts from organizers). Table is "announcement"
  because UPDATE is a reserved word in SQL; the UI calls them Updates.
  - Plain text only: rendered as text, never as HTML, so a post can't
    inject markup or scripts.
  - Staff can post, edit and delete; every change goes to audit_log.
  - Authors can't be deleted while they have posts (accounts are
    disabled, not deleted), so attribution never breaks.
*/
export const UPDATE_CATEGORIES = ["Announcement", "Logistics", "Events", "Fundraising", "Volunteers"] as const;

export const announcement = pgTable(
  "announcement",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    category: text("category", { enum: UPDATE_CATEGORIES }),
    authorId: text("author_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
    editedAt: timestamp("edited_at", { withTimezone: true }),
  },
  (t) => [
    check("announcement_title_length", sql`char_length(${t.title}) BETWEEN 1 AND 120`),
    check("announcement_body_length", sql`char_length(${t.body}) BETWEEN 1 AND 5000`),
    check(
      "announcement_category_valid",
      sql`${t.category} IS NULL OR ${t.category} IN ('Announcement', 'Logistics', 'Events', 'Fundraising', 'Volunteers')`,
    ),
    index("announcement_published_idx").on(t.publishedAt),
  ],
);


/*
  Messages: classmates contact the organizers.
  - One thread per conversation, started by a classmate (memberId).
  - The classmate sees only their own threads. All staff share one inbox
    and see every thread (it may cover payments, so treasurers need it).
  - Read state is two timestamps: the classmate's, and the shared staff
    inbox's. Unread = a newer message from the other side.
  - Plain text, no edits or deletes in the app: what was said stays said.
*/
export const messageThread = pgTable(
  "message_thread",
  {
    id: text("id").primaryKey(),
    memberId: text("member_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    subject: text("subject").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }).notNull().defaultNow(),
    lastAuthorIsStaff: boolean("last_author_is_staff").notNull().default(false),
    memberReadAt: timestamp("member_read_at", { withTimezone: true }),
    staffReadAt: timestamp("staff_read_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
  },
  (t) => [
    check("message_thread_subject_length", sql`char_length(${t.subject}) BETWEEN 1 AND 120`),
    index("message_thread_member_idx").on(t.memberId),
    index("message_thread_last_idx").on(t.lastMessageAt),
  ],
);

export const message = pgTable(
  "message",
  {
    id: text("id").primaryKey(),
    threadId: text("thread_id")
      .notNull()
      .references(() => messageThread.id, { onDelete: "restrict" }),
    authorId: text("author_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    fromStaff: boolean("from_staff").notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("message_body_length", sql`char_length(${t.body}) BETWEEN 1 AND 4000`),
    index("message_thread_idx").on(t.threadId, t.createdAt),
  ],
);
/*
  Polls: organizers ask a question with 2 to 10 options; each classmate
  picks one option and may change it until the poll closes.
  - Votes are anonymous in the app: pages show counts only, never who
    voted for what (the vote row exists so each person votes once).
  - A poll closes at closesAt, or earlier if an organizer closes it.
  - The database enforces one vote per person per poll, and that the
    chosen option belongs to that poll.
*/
export const POLL_RESULTS = ["after_vote", "after_close"] as const;

export const poll = pgTable(
  "poll",
  {
    id: text("id").primaryKey(),
    question: text("question").notNull(),
    details: text("details"),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    closesAt: timestamp("closes_at", { withTimezone: true }).notNull(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    showResults: text("show_results", { enum: POLL_RESULTS }).notNull().default("after_vote"),
  },
  (t) => [
    check("poll_question_length", sql`char_length(${t.question}) BETWEEN 1 AND 200`),
    check("poll_details_length", sql`${t.details} IS NULL OR char_length(${t.details}) <= 1000`),
    check("poll_show_results_valid", sql`${t.showResults} IN ('after_vote', 'after_close')`),
    index("poll_closes_idx").on(t.closesAt),
  ],
);

export const pollOption = pgTable(
  "poll_option",
  {
    id: text("id").primaryKey(),
    pollId: text("poll_id")
      .notNull()
      .references(() => poll.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    position: integer("position").notNull(),
  },
  (t) => [
    check("poll_option_label_length", sql`char_length(${t.label}) BETWEEN 1 AND 120`),
    // Lets a vote reference (option, poll) together, so it can't point at another poll's option
    unique("poll_option_id_poll_key").on(t.id, t.pollId),
    index("poll_option_poll_idx").on(t.pollId, t.position),
  ],
);

export const pollVote = pgTable(
  "poll_vote",
  {
    pollId: text("poll_id")
      .notNull()
      .references(() => poll.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    optionId: text("option_id").notNull(),
    votedAt: timestamp("voted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.pollId, t.userId] }), // one vote per person per poll
    foreignKey({
      name: "poll_vote_option_in_poll_fk",
      columns: [t.optionId, t.pollId],
      foreignColumns: [pollOption.id, pollOption.pollId],
    }).onDelete("cascade"),
    index("poll_vote_option_idx").on(t.optionId),
  ],
);

/*
  RSVP: one row per classmate for the reunion. No row means "not replied".
  - Organizers record RSVPs (like contributions); classmates can't edit them.
  - Everyone can see every status, guest count and specialty item.
  - Guests and the specialty item only apply to "attending"; the database
    clears them otherwise, so a stale value can't linger after a change.
*/
export const RSVP_STATUSES = ["attending", "maybe", "not_attending"] as const;

export const rsvp = pgTable(
  "rsvp",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    status: text("status", { enum: RSVP_STATUSES }).notNull(),
    guests: integer("guests").notNull().default(0),
    bringing: text("bringing"), // the fun field: "famous apple pie"
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    updatedBy: text("updated_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
  },
  (t) => [
    check("rsvp_status_valid", sql`${t.status} IN ('attending', 'maybe', 'not_attending')`),
    check("rsvp_guests_range", sql`${t.guests} BETWEEN 0 AND 5`),
    check("rsvp_bringing_length", sql`${t.bringing} IS NULL OR char_length(${t.bringing}) BETWEEN 1 AND 80`),
    check("rsvp_extras_only_when_attending", sql`${t.status} = 'attending' OR (${t.guests} = 0 AND ${t.bringing} IS NULL)`),
    index("rsvp_status_idx").on(t.status),
  ],
);

/*
  Music playlists: staff-posted cards linking out to a streaming service.
  - url is NOT what the organizer pasted: src/lib/playlist-url.ts checks it
    against an allowlist and rebuilds a clean link from the playlist ID.
  - The checks below are a second line of defense: https on a known host.
*/
export const PLAYLIST_PROVIDERS = ["spotify", "youtube", "youtube_music", "soundcloud"] as const;

export const playlist = pgTable(
  "playlist",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    provider: text("provider", { enum: PLAYLIST_PROVIDERS }).notNull(),
    url: text("url").notNull(),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (t) => [
    check("playlist_title_length", sql`char_length(${t.title}) BETWEEN 1 AND 80`),
    check("playlist_description_length", sql`${t.description} IS NULL OR char_length(${t.description}) <= 300`),
    check("playlist_provider_valid", sql`${t.provider} IN ('spotify', 'youtube', 'youtube_music', 'soundcloud')`),
    check(
      "playlist_url_allowed",
      sql`${t.url} ~ '^https://(open\\.spotify\\.com|www\\.youtube\\.com|music\\.youtube\\.com|soundcloud\\.com)/'`,
    ),
    index("playlist_created_idx").on(t.createdAt),
  ],
);

