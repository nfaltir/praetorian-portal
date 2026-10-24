import "server-only";
import { randomUUID } from "node:crypto";
import { db } from "@/db";
import { auditLog, user } from "@/db/schema";
import { site } from "@/config/site";
import { toCsv, type CsvCell } from "@/lib/csv";
import { reversedIds, totalsByMember } from "@/lib/ledger";
import { can, type Role } from "@/lib/roles";
import type { CurrentUser } from "@/lib/session";
import { loadLedger, loadRoster } from "@/server/ledger";
import { listPlaylists } from "@/server/playlists";
import { loadRsvpBoard } from "@/server/rsvp";
import { loadUpdates } from "@/server/updates";

/*
  Staff CSV exports. The ONLY code that builds downloadable data.
  - Each export declares who may download it; the route re-checks it here.
  - Every download is written to the audit log (who, what, how many rows).
  - Never exported: passwords, 2FA secrets, sessions, setup tokens, emails.
  - Treasurer-only notes on ledger entries are included only for
    treasurers, matching what the Treasury page shows.
*/

export class ExportError extends Error {}

type Table = { header: string[]; rows: CsvCell[][] };

type ExportDef = {
  label: string;
  description: string;
  allowed: (role: Role) => boolean;
  build: (actor: CurrentUser) => Promise<Table>;
};

const SERVICE = { spotify: "Spotify", youtube: "YouTube", youtube_music: "YouTube Music", soundcloud: "SoundCloud" } as const;
const RSVP_LABEL = { attending: "Attending", maybe: "Maybe", not_attending: "Not attending" } as const;

/* "2026-10-23 18:05" in class time, so every file uses one clock */
const stamp = (iso: string | Date) => {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: site.timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
      .formatToParts(new Date(iso))
      .map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`;
};

const dollars = (cents: number) => (cents / 100).toFixed(2);

async function allNames() {
  // Includes disabled members so old ledger rows still show a name
  const rows = await db.select({ id: user.id, name: user.name }).from(user);
  return new Map(rows.map((r) => [r.id, r.name]));
}

export const EXPORTS = {
  updates: {
    label: "Updates",
    description: "Every update with author, category, date and full text.",
    allowed: can.manageContent,
    build: async () => {
      const posts = await loadUpdates();
      return {
        header: ["Published", "Author", "Category", "Title", "Update", "Last edited"],
        rows: posts.map((u) => [
          stamp(u.publishedAt),
          u.authorName,
          u.category ?? "",
          u.title,
          u.body,
          u.editedAt ? stamp(u.editedAt) : "",
        ]),
      };
    },
  },

  rsvp: {
    label: "RSVP list",
    description: "Every active classmate with status, guests and what they're bringing.",
    allowed: can.manageMembers,
    build: async () => {
      const { entries } = await loadRsvpBoard();
      return {
        header: ["Classmate", "Status", "Guests", "Bringing", "Last changed"],
        rows: entries.map((e) => [
          e.name,
          e.status ? RSVP_LABEL[e.status] : "Not replied",
          e.status === "attending" ? e.guests : "",
          e.bringing ?? "",
          e.updatedAt ? stamp(e.updatedAt) : "",
        ]),
      };
    },
  },

  playlists: {
    label: "Music playlists",
    description: "Playlist names, services and links.",
    allowed: can.manageContent,
    build: async () => {
      const lists = await listPlaylists();
      return {
        header: ["Playlist", "Service", "Link", "Description", "Added by", "Added on"],
        rows: lists.map((p) => [p.title, SERVICE[p.provider], p.url, p.description ?? "", p.createdByName, stamp(p.createdAt)]),
      };
    },
  },

  contributions: {
    label: "Treasury: all entries",
    description: "Every payment and correction, newest first, with who recorded it.",
    allowed: can.manageMembers,
    build: async (actor) => {
      const [ledger, names] = await Promise.all([loadLedger(), allNames()]);
      const reversed = reversedIds(ledger);
      const withNotes = can.manageLedger(actor.role);
      const name = (id: string) => names.get(id) ?? "Unknown";
      return {
        header: [
          "Date paid",
          "Classmate",
          "Type",
          "Amount",
          "Status",
          "Recorded by",
          "Recorded at",
          ...(withNotes ? ["Note"] : []),
        ],
        rows: ledger.map((e) => {
          const isReversal = e.kind === "reversal";
          return [
            e.paidOn,
            name(e.memberId),
            isReversal ? "Correction" : "Payment",
            // Corrections are negative so a SUM() of the column gives the true total
            Number(dollars(isReversal ? -e.amountCents : e.amountCents)),
            isReversal ? "Correction" : reversed.has(e.id) ? "Reversed" : "Recorded",
            name(e.recordedBy),
            stamp(e.recordedAt),
            ...(withNotes ? [e.memo ?? ""] : []),
          ];
        }),
      };
    },
  },

  balances: {
    label: "Treasury: balances and targets",
    description: "Each active classmate's target, amount given, remaining and percent.",
    allowed: can.manageMembers,
    build: async () => {
      const [ledger, roster] = await Promise.all([loadLedger(), loadRoster()]);
      const totals = totalsByMember(ledger);
      return {
        header: ["Classmate", "Target", "Given", "Remaining", "Percent of target"],
        rows: roster.map((m) => {
          const given = Math.max(0, totals.get(m.id) ?? 0);
          return [
            m.name,
            Number(dollars(m.targetCents)),
            Number(dollars(given)),
            Number(dollars(Math.max(0, m.targetCents - given))),
            m.targetCents > 0 ? Math.round((given / m.targetCents) * 100) : 0,
          ];
        }),
      };
    },
  },
} satisfies Record<string, ExportDef>;

export type ExportKind = keyof typeof EXPORTS;

export const isExportKind = (k: string): k is ExportKind => Object.hasOwn(EXPORTS, k);

/* Builds the file and logs the download. Throws if the role isn't allowed. */
export async function buildExport(actor: CurrentUser, kind: ExportKind) {
  const def: ExportDef = EXPORTS[kind];
  if (!def.allowed(actor.role)) throw new ExportError("Not allowed.");

  const table = await def.build(actor);
  const csv = toCsv(table.header, table.rows);

  await db.insert(auditLog).values({
    id: randomUUID(),
    actorId: actor.id,
    action: "export.downloaded",
    detail: { kind, rows: table.rows.length },
  });

  const day = stamp(new Date()).slice(0, 10);
  return { csv, filename: `praetorianz-${kind}-${day}.csv` };
}
