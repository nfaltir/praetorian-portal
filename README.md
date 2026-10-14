# Praetorianz Reunion Portal

Private portal for the Xavier High School Class of 2010 (Praetorianz), reunion 2030.

Next.js 16 (App Router, Cache Components), TypeScript, Tailwind CSS 4, Drizzle ORM, PostgreSQL (Neon), Better Auth, Recharts, Lucide.

## Status

| Step | Scope | Status |
|---|---|---|
| 1 | Shell, theme tokens, dashboard on mock data | Done |
| 2 | Database, Better Auth, roles, required staff 2FA, setup links | Done |
| 3 | Ledger: record, reverse, targets | Next |
| 4 | Dashboard on real data | |
| 5 | Updates, events | |
| 6 | Messages inbox | |
| 7 | Encrypted JSON export and daily backup | |

Sign-in and accounts are real. Dashboard content (contributions, updates, events, poll) is still **mock data** until steps 3 to 5.

## Run locally

You need a Postgres database: a Neon development branch, or any local Postgres 16+.

```bash
npm install
cp .env.example .env.local          # then fill in the three values
npm run db:migrate                  # create tables
npm run create-superuser -- nivz    # prints a one-time setup link
npm run dev                         # http://localhost:3000, open the link
```

## Commands

| Command | What it does |
|---|---|
| `npm run dev` / `build` / `lint` | Usual Next.js commands |
| `npm run db:migrate` | Apply pending migrations to `DATABASE_URL` |
| `npm run db:generate` | Create a migration after editing `src/db/app-schema.ts` |
| `npm run auth:schema` | Regenerate `src/db/auth-schema.ts` after changing Better Auth config (then `db:generate`) |
| `npm run create-superuser -- nivz` | First account. Refuses if a superuser already exists |
| `npm run create-superuser -- nivz --reset` | New password link for the superuser |
| `npm run create-superuser -- nivz --reset --reset-2fa` | Same, and removes 2FA (lost phone and backup codes) |

## Deploy (Vercel + Neon)

1. **Neon:** create a project (Postgres 16 or 17). Copy the **pooled** connection string (host contains `-pooler`).
2. **Vercel:** import the repo. Under Settings, Environment Variables, add for Production:
   - `DATABASE_URL`: the pooled Neon string
   - `BETTER_AUTH_SECRET`: a fresh value, not your local one
     (`node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`)
   - `BETTER_AUTH_URL`: your production URL, e.g. `https://praetorianz.vercel.app`
3. Put the Vercel function region in the same region as the Neon database (Vercel Settings, Functions).
4. From your machine, with the **production** values, run the migration and create your account:
   ```bash
   DATABASE_URL="<prod pooled url>" npm run db:migrate
   DATABASE_URL="<prod pooled url>" BETTER_AUTH_SECRET="<prod secret>" BETTER_AUTH_URL="<prod url>" \
     npm run create-superuser -- nivz
   ```
5. Open the printed link, set your password, and set up 2FA when prompted. Then add the four staff from Staff Admin.

Migrations do not run during the Vercel build on purpose: schema changes to the money database should be run by a person, after taking an export.

## Security model

- **No public sign-up.** Staff create accounts and send a one-time link (72 hours, single use, only a SHA-256 hash is stored). The token sits in the URL fragment, so it never reaches server logs and is removed from the address bar on load.
- **Sessions** are database-backed httpOnly cookies, 14 days. Changing a password or disabling an account ends all sessions.
- **2FA (TOTP) is mandatory for staff.** Staff accounts without it are held on the security page; switching it off is refused at the API. Secrets are stored encrypted.
- **Rate limits** per IP, stored in the database so they hold across serverless instances: sign-in 20 per 5 minutes, 2FA codes 10 per 5 minutes, backup codes 5 per 5 minutes.
- **Authorization** is checked on the server in every page and action (`src/lib/session.ts`, `src/lib/roles.ts`). The proxy only redirects. Staff pages return 404 to non-staff.
- **Roles** are defined in code. Role, target and disabled flag can't be set from the browser.
- **Unused auth endpoints** (email sign-in, sign-up, profile update, email reset and others) are switched off.
- **Audit log** is append-only, enforced by a database trigger.
- **Headers:** CSP, no framing, HSTS, nosniff, strict referrer, `noindex`.
  The CSP allows inline scripts because nonce-based CSP is incompatible with Partial Prerendering in this Next version. It still restricts scripts, styles, fonts, images and requests to this site, and forms to posting back to it.

Tests: `tests/e2e_auth.py` drives a real browser through 28 auth and permission checks. Run it against a fresh local database after upgrading `better-auth` or `next` (instructions at the top of the file).

## Where things live

| Change this | File |
|---|---|
| Colors, radii (whole site) | `src/app/globals.css`, the `:root` block |
| School name, class, year, reunion date, tagline, time zone | `src/config/site.ts` |
| Sidebar items and who sees them | `src/config/nav.ts` |
| Roles and what each may do | `src/lib/roles.ts` |
| Better Auth configuration | `src/lib/auth.ts` |
| Who is signed in (every page calls this) | `src/lib/session.ts` |
| Account creation, setup and reset links | `src/server/accounts.ts` |
| App tables | `src/db/app-schema.ts` |
| Contribution math | `src/lib/ledger.ts` |
| Mock dashboard data (removed in steps 3 to 5) | `src/lib/mock-data.ts` |

Setting `reunionDate` in `src/config/site.ts` (ISO with offset, e.g. `"2030-08-14T18:00:00+10:00"`) turns on the banner countdown. While it is `null` the banner shows "Date to be announced".

## Rules the code follows

- Contributions are integer cents. Entries are never edited or deleted; corrections are reversal entries.
- Class goal is the sum of individual targets (default $400). Targets are private; public views show dollars contributed only.
- Anything that reads the session sits inside a `<Suspense>` boundary (Cache Components requirement). Never await the session at the top of a layout.
- Shared chrome (sidebar, account menu) only reads the user; pages enforce access.
- Password forms handled in JavaScript keep their submit button disabled until hydrated, so they can never fall back to a GET submission.
- No em dashes in UI text.

## Fonts

Inter and Cormorant Garamond are self-hosted from `src/app/fonts` (SIL Open Font License, see the license files there), so members' browsers never contact Google.
