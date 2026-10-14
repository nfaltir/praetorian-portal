import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { can } from "@/lib/roles";
import { Alert } from "@/components/ui/Form";
import { ChangePasswordCard, TwoFactorCard } from "./SecurityCards";

export const metadata: Metadata = { title: "Password and 2FA" };

export default async function SecurityPage({ searchParams }: PageProps<"/settings/security">) {
  const user = await requireUser({ allowMissingTwoFactor: true });
  const required = can.requiresTwoFactor(user.role);
  const { required: flag } = await searchParams;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="font-serif text-[34px] leading-tight font-semibold">Password and 2FA</h1>
        <p className="mt-1 text-[14px] text-muted">Signed in as @{user.username}</p>
      </div>

      {required && !user.twoFactorEnabled && (
        <Alert tone="info">
          {flag === "2fa" ? "Before you continue: " : ""}
          organizer accounts can change records and create accounts, so two-step verification is required. Set it up below to unlock the rest of the portal.
        </Alert>
      )}

      <TwoFactorCard enabled={user.twoFactorEnabled} required={required} />
      <ChangePasswordCard />
    </div>
  );
}
