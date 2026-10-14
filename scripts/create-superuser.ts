/*
  Creates the superuser (developer) account and prints a one-time setup link.
  There is no sign-up page, so this is how the very first account is made.

    npm run create-superuser -- nivz
    npm run create-superuser -- nivz --name "Nivz"

  Recovery, if the superuser is locked out (lost password, or lost both the
  authenticator and the backup codes). Requires database access, which is
  the real proof of ownership here:

    npm run create-superuser -- nivz --reset          new password link
    npm run create-superuser -- nivz --reset --reset-2fa   also removes 2FA

  Targets whatever DATABASE_URL is set: .env.local locally, or pass the
  production URL explicitly when bootstrapping production.
*/
import { parseArgs } from "node:util";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { twoFactor, user } from "@/db/schema";
import { env } from "@/lib/env";
import { audit } from "@/server/audit";
import { createMember, issueLink, usernameSchema } from "@/server/accounts";

async function main() {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      name: { type: "string" },
      reset: { type: "boolean", default: false },
      "reset-2fa": { type: "boolean", default: false },
    },
  });

  const username = usernameSchema.parse(positionals[0] ?? "");
  const host = new URL(env.DATABASE_URL).host;
  console.log(`Database: ${host}`);

  const existing = await db.query.user.findFirst({ where: eq(user.username, username) });

  if (existing) {
    if (!values.reset) {
      console.error(`@${username} already exists. Use --reset to issue a new password link.`);
      process.exit(1);
    }
    if (existing.role !== "superuser") {
      console.error(`@${username} is not the superuser. Use the Staff Admin page for other accounts.`);
      process.exit(1);
    }
    if (values["reset-2fa"]) {
      await db.delete(twoFactor).where(eq(twoFactor.userId, existing.id));
      await db.update(user).set({ twoFactorEnabled: false }).where(eq(user.id, existing.id));
      await audit({ actorId: null, action: "link.reset_issued", targetUserId: existing.id, detail: { via: "cli", twoFactorRemoved: true } });
      console.log("2FA removed. You will be asked to set it up again after signing in.");
    }
    const token = await issueLink({ userId: existing.id, purpose: "reset", actorId: null });
    print(token);
    return;
  }

  const superusers = await db.query.user.findMany({ columns: { id: true }, where: eq(user.role, "superuser") });
  if (superusers.length > 0) {
    console.error("A superuser already exists. Only one is created by this script.");
    process.exit(1);
  }

  const created = await createMember({ name: values.name ?? username, username, role: "superuser", actorId: null });
  const token = await issueLink({ userId: created.id, purpose: "setup", actorId: null });
  print(token);
}

function print(token: string) {
  console.log("\nOne-time link (expires in 72 hours, works once):\n");
  console.log(`  ${env.BETTER_AUTH_URL}/setup#${token}\n`);
  console.log("Open it in your browser, choose a password, then set up 2FA when prompted.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
