import { index, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
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
