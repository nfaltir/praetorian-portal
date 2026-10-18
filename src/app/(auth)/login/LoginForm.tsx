"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { useHydrated } from "@/lib/use-hydrated";
import { Alert, Button, Field } from "@/components/ui/Form";

type Step = "password" | "totp" | "backup";

/* One message for every credential failure, so usernames can't be probed. */
const BAD_LOGIN = "That username and password don't match. Check both and try again.";
const TOO_MANY = "Too many attempts. Wait a few minutes before trying again.";

/*
  Only real credential failures (400/401) get the credential message.
  Anything else is a problem with the site, not the person, so say so and
  show the status code: otherwise a server or configuration error looks
  exactly like a wrong password and can't be diagnosed.
*/
function messageFor(err: { status?: number; message?: string }, credentialMessage: string) {
  const s = err.status;
  console.error("[sign-in]", s, err.message); // visible in the browser console for debugging
  if (s === 429) return TOO_MANY;
  if (s === 400 || s === 401) return credentialMessage;
  if (s === 403) return `Sign-in was blocked by the server (error 403). Make sure you're on the portal's main address, then try again. If it keeps happening, tell an organizer.`;
  if (s && s >= 500) return `The portal had a problem on its side (error ${s}). Please try again in a minute.`;
  return `Couldn't reach the portal${s ? ` (error ${s})` : ""}. Check your connection and try again.`;
}

export function LoginForm({ notice }: { notice: string | null }) {
  const [step, setStep] = useState<Step>("password");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const hydrated = useHydrated();
  const enter = () => {
    router.replace("/");
    router.refresh();
  };

  async function onPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    const { data, error: err } = await authClient.signIn.username({
      username: String(form.get("username") ?? "").trim().toLowerCase(),
      password: String(form.get("password") ?? ""),
    });
    setBusy(false);
    if (err) return setError(messageFor(err, BAD_LOGIN));
    if (data && "twoFactorRedirect" in data && data.twoFactorRedirect) return setStep("totp");
    enter();
  }

  async function onCode(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const code = String(new FormData(e.currentTarget).get("code") ?? "").replace(/\s+/g, "");
    setBusy(true);
    setError(null);
    const { error: err } =
      step === "totp"
        ? await authClient.twoFactor.verifyTotp({ code })
        : await authClient.twoFactor.verifyBackupCode({ code });
    setBusy(false);
    if (err) {
      return setError(
        messageFor(err, step === "totp" ? "That code didn't work. Codes change every 30 seconds." : "That backup code didn't work, or it was already used."),
      );
    }
    enter();
  }

  if (step !== "password") {
    return (
      <form method="post" onSubmit={onCode} className="flex flex-col gap-5" noValidate>
        <div>
          <h1 className="font-serif text-[26px] font-semibold">Two-step verification</h1>
          <p className="mt-1 text-[14px] text-muted">
            {step === "totp"
              ? "Enter the 6-digit code from your authenticator app."
              : "Enter one of the backup codes you saved when you set up 2FA. Each works once."}
          </p>
        </div>
        {error && <Alert tone="error">{error}</Alert>}
        <Field
          id="code"
          name="code"
          label={step === "totp" ? "Authentication code" : "Backup code"}
          inputMode={step === "totp" ? "numeric" : "text"}
          autoComplete="one-time-code"
          pattern={step === "totp" ? "[0-9 ]*" : undefined}
          maxLength={step === "totp" ? 7 : 32}
          required
          autoFocus
        />
        <Button type="submit" disabled={busy || !hydrated}>{busy ? "Checking..." : "Verify"}</Button>
        <button
          type="button"
          className="text-[13px] font-medium text-brand hover:underline"
          onClick={() => {
            setError(null);
            setStep(step === "totp" ? "backup" : "totp");
          }}
        >
          {step === "totp" ? "Lost your phone? Use a backup code" : "Use authenticator app instead"}
        </button>
      </form>
    );
  }

  return (
    <form method="post" onSubmit={onPassword} className="flex flex-col gap-5" noValidate>
      <div>
        <h1 className="font-serif text-[26px] font-semibold">Sign in</h1>
        <p className="mt-1 text-[14px] text-muted">Use the username the organizers gave you.</p>
      </div>
      {notice && <Alert tone="success">{notice}</Alert>}
      {error && <Alert tone="error">{error}</Alert>}
      <Field id="username" name="username" label="Username" autoComplete="username" autoCapitalize="none" spellCheck={false} required autoFocus />
      <Field id="password" name="password" type="password" label="Password" autoComplete="current-password" required />
      <Button type="submit" disabled={busy || !hydrated}>{busy ? "Signing in..." : "Sign in"}</Button>
      <p className="text-center text-[13px] text-muted">
        Forgot your password? Ask an organizer for a reset link.
      </p>
    </form>
  );
}
