"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { ShieldCheck, ShieldOff } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useHydrated } from "@/lib/use-hydrated";
import { Alert, Button, Field } from "@/components/ui/Form";
import { Badge, Panel } from "@/components/ui/Panel";

function errorText(err: { status?: number; message?: string } | null | undefined, fallback: string) {
  if (!err) return fallback;
  if (err.status === 429) return "Too many attempts. Wait a few minutes and try again.";
  return fallback;
}

type Enrollment = { qr: string; secret: string; backupCodes: string[] };

export function TwoFactorCard({ enabled, required }: { enabled: boolean; required: boolean }) {
  const router = useRouter();
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [freshCodes, setFreshCodes] = useState<string[] | null>(null);
  const hydrated = useHydrated();

  async function start(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const password = String(new FormData(e.currentTarget).get("password") ?? "");
    setBusy(true);
    setError(null);
    const { data, error: err } = await authClient.twoFactor.enable({ password });
    setBusy(false);
    if (err || !data) return setError(errorText(err, "That password is not correct."));
    if (!("totpURI" in data)) return setError("Unexpected response. Try again.");
    // QR code is drawn here in the browser; the secret never goes to a third party
    const qr = await QRCode.toDataURL(data.totpURI, { margin: 1, width: 220 });
    const secret = new URL(data.totpURI).searchParams.get("secret") ?? "";
    setEnrollment({ qr, secret, backupCodes: data.backupCodes });
  }

  async function confirm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const code = String(new FormData(e.currentTarget).get("code") ?? "").replace(/\s+/g, "");
    setBusy(true);
    setError(null);
    const { error: err } = await authClient.twoFactor.verifyTotp({ code });
    setBusy(false);
    if (err) return setError(errorText(err, "That code didn't match. Check your phone's clock and try the newest code."));
    setEnrollment(null);
    router.refresh();
  }

  async function disable(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const password = String(new FormData(e.currentTarget).get("password") ?? "");
    setBusy(true);
    setError(null);
    const { error: err } = await authClient.twoFactor.disable({ password });
    setBusy(false);
    if (err) return setError(errorText(err, "That password is not correct."));
    router.refresh();
  }

  async function regenerate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const password = String(new FormData(e.currentTarget).get("password") ?? "");
    setBusy(true);
    setError(null);
    const { data, error: err } = await authClient.twoFactor.generateBackupCodes({ password });
    setBusy(false);
    if (err || !data) return setError(errorText(err, "That password is not correct."));
    setFreshCodes(data.backupCodes);
    (e.target as HTMLFormElement).reset();
  }

  return (
    <Panel className="p-6" labelledBy="tfa-heading">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="tfa-heading" className="font-serif text-[22px] font-semibold">Two-step verification</h2>
          <p className="mt-1 text-[14px] text-muted">A 6-digit code from an authenticator app, asked for each time you sign in.</p>
        </div>
        {enabled ? (
          <Badge tone="success" icon={ShieldCheck}>On</Badge>
        ) : (
          <Badge tone={required ? "warning" : "neutral"} icon={ShieldOff}>Off</Badge>
        )}
      </div>

      <div className="mt-5 flex flex-col gap-4">
        {error && <Alert tone="error">{error}</Alert>}

        {!enabled && !enrollment && (
          <form method="post" onSubmit={start} className="flex flex-col gap-4">
            <p className="text-[14px]">
              Install an authenticator app first (Google Authenticator, Microsoft Authenticator, 1Password or similar). Then confirm your password to begin.
            </p>
            <Field id="tfa-password" name="password" type="password" label="Current password" autoComplete="current-password" required />
            <Button type="submit" disabled={busy || !hydrated} className="self-start">{busy ? "Starting..." : "Set up 2FA"}</Button>
          </form>
        )}

        {enrollment && (
          <div className="flex flex-col gap-5">
            <ol className="flex list-decimal flex-col gap-4 pl-5 text-[14px]">
              <li>
                Scan this with your authenticator app.
                <div className="mt-3 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                  {/* eslint-disable-next-line @next/next/no-img-element -- local data URL */}
                  <img src={enrollment.qr} width={180} height={180} alt="QR code for your authenticator app" className="rounded-control border border-line" />
                  <div className="text-[13px] text-muted">
                    Can&apos;t scan? Enter this key manually:
                    <code className="mt-1 block break-all rounded bg-page px-2 py-1 font-mono text-[13px] text-ink">{enrollment.secret}</code>
                  </div>
                </div>
              </li>
              <li>
                Save these backup codes somewhere safe, like a password manager. Each one gets you in once if you lose your phone.
                <BackupCodes codes={enrollment.backupCodes} />
              </li>
              <li>Enter the 6-digit code your app shows now.</li>
            </ol>
            <form method="post" onSubmit={confirm} className="flex flex-col gap-4">
              <Field id="tfa-code" name="code" label="Authentication code" inputMode="numeric" autoComplete="one-time-code" maxLength={7} required autoFocus />
              <Button type="submit" disabled={busy || !hydrated} className="self-start">{busy ? "Checking..." : "Turn on 2FA"}</Button>
            </form>
          </div>
        )}

        {enabled && (
          <>
            {freshCodes && (
              <Alert tone="success">
                New backup codes. The old ones no longer work.
                <BackupCodes codes={freshCodes} />
              </Alert>
            )}
            <form method="post" onSubmit={regenerate} className="flex flex-col gap-3 border-t border-line pt-4">
              <p className="text-[14px] font-medium">New backup codes</p>
              <Field id="bc-password" name="password" type="password" label="Current password" autoComplete="current-password" required />
              <Button type="submit" variant="secondary" disabled={busy || !hydrated} className="self-start">Generate new codes</Button>
            </form>
            {!required && (
              <form method="post" onSubmit={disable} className="flex flex-col gap-3 border-t border-line pt-4">
                <p className="text-[14px] font-medium">Turn off 2FA</p>
                <Field id="off-password" name="password" type="password" label="Current password" autoComplete="current-password" required />
                <Button type="submit" variant="danger" disabled={busy || !hydrated} className="self-start">Turn off</Button>
              </form>
            )}
          </>
        )}
      </div>
    </Panel>
  );
}

function BackupCodes({ codes }: { codes: string[] }) {
  return (
    <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 rounded-control bg-page p-3 font-mono text-[13px] text-ink sm:grid-cols-3">
      {codes.map((c) => (
        <li key={c}>{c}</li>
      ))}
    </ul>
  );
}

export function ChangePasswordCard() {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const hydrated = useHydrated();

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const f = new FormData(formEl);
    const currentPassword = String(f.get("current") ?? "");
    const newPassword = String(f.get("next") ?? "");
    if (newPassword.length < 12) return setError("Use at least 12 characters.");
    if (newPassword !== String(f.get("confirm") ?? "")) return setError("New passwords don't match.");
    setBusy(true);
    setError(null);
    setDone(false);
    const { error: err } = await authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: true });
    setBusy(false);
    if (err) return setError(errorText(err, "Current password is not correct."));
    formEl.reset();
    setDone(true);
  }

  return (
    <Panel className="p-6" labelledBy="pw-heading">
      <h2 id="pw-heading" className="font-serif text-[22px] font-semibold">Change password</h2>
      <p className="mt-1 text-[14px] text-muted">Signs you out everywhere else.</p>
      <form method="post" onSubmit={submit} className="mt-5 flex flex-col gap-4">
        {error && <Alert tone="error">{error}</Alert>}
        {done && <Alert tone="success">Password changed.</Alert>}
        <Field id="current" name="current" type="password" label="Current password" autoComplete="current-password" required />
        <Field id="next" name="next" type="password" label="New password" autoComplete="new-password" hint="At least 12 characters." minLength={12} maxLength={128} required />
        <Field id="confirm" name="confirm" type="password" label="Confirm new password" autoComplete="new-password" required />
        <Button type="submit" disabled={busy || !hydrated} className="self-start">{busy ? "Saving..." : "Change password"}</Button>
      </form>
    </Panel>
  );
}
