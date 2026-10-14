# Praetorianz Reunion Portal

Private portal for the Xavier High School Class of 2010 (Praetorianz), reunion 2030.

Next.js 16 (App Router, Cache Components), TypeScript, Tailwind CSS 4, Recharts, Lucide.

## Status

Step 1 of the build: app shell, theme and dashboard on **mock data**.
No database, no authentication yet. Do not deploy publicly in this state.

| Step | Scope | Status |
|---|---|---|
| 1 | Shell, theme tokens, dashboard on mock data | Done |
| 2 | Drizzle + Neon schema, Better Auth, roles, 2FA, setup links | Next |
| 3 | Ledger: record, reverse, audit log, targets | |
| 4 | Dashboard on real data | |
| 5 | Updates, events | |
| 6 | Messages inbox | |
| 7 | Encrypted JSON export and daily backup | |

## Run locally

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # production build
npm run lint
```

## Where things live

| Change this | File |
|---|---|
| Colors, radii (whole site) | `src/app/globals.css`, the `:root` block |
| School name, class, year, reunion date, tagline | `src/config/site.ts` |
| Sidebar items and who sees them | `src/config/nav.ts` |
| Contribution math | `src/lib/ledger.ts` |
| Signed-in user lookup (auth seam) | `src/lib/session.ts` |
| Mock data (delete in step 2) | `src/lib/mock-data.ts` |

Setting `reunionDate` in `src/config/site.ts` (ISO with offset, e.g. `"2030-08-14T18:00:00-07:00"`) turns on the banner countdown. While it is `null` the banner shows "Date to be announced".

## Rules the code follows

- Contributions are integer cents. Entries are never edited or deleted; corrections are reversal entries.
- Class goal is the sum of individual targets (default $400). Targets are private; public views show dollars contributed only.
- Anything that reads the session sits inside a `<Suspense>` boundary (Cache Components requirement). Never await the session at the top of a layout.
- Hiding a nav link is cosmetic. Every page and server action checks the role on the server.
- No em dashes in UI text.

## Fonts

Inter and Cormorant Garamond are self-hosted from `src/app/fonts` (SIL Open Font License, see the license files there), so members' browsers never contact Google.
