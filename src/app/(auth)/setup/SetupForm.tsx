"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { Alert, Button, Field } from "@/components/ui/Form";
import { checkLinkAction, redeemLinkAction } from "./actions";

type LinkInfo = { name: string; username: string | null; purpose: "setup" | "reset" };

export function SetupForm() {
  const [token, setToken] = useState<string | null>(null);
  const [info, setInfo] = useState<LinkInfo | null | "invalid">(null);
  const [state, formAction, pending] = useActionState(redeemLinkAction, null);

  useEffect(() => {
    const t = window.location.hash.slice(1);
    // Remove the token from the address bar and history right away
    history.replaceState(null, "", window.location.pathname);
    if (!t) {
      queueMicrotask(() => setInfo("invalid"));
      return;
    }
    checkLinkAction(t).then((res) => {
      setToken(t);
      setInfo(res ?? "invalid");
    });
  }, []);

  if (info === null) {
    return <p className="py-8 text-center text-[14px] text-muted">Checking your link...</p>;
  }

  if (info === "invalid") {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-serif text-[26px] font-semibold">Link not valid</h1>
        <Alert tone="error">
          This link is invalid, has expired, or was already used. Links work once and expire after 72 hours. Ask an organizer for a new one.
        </Alert>
        <Link href="/login" className="text-center text-[14px] font-medium text-brand hover:underline">Go to sign in</Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div>
        <h1 className="font-serif text-[26px] font-semibold">
          {info.purpose === "setup" ? `Welcome, ${info.name.split(" ")[0]}` : "Choose a new password"}
        </h1>
        <p className="mt-1 text-[14px] text-muted">
          Your username is <span className="font-semibold text-ink">{info.username}</span>. Choose a password you don&apos;t use anywhere else.
        </p>
      </div>
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      <input type="hidden" name="token" value={token ?? ""} />
      {/* Hidden username helps password managers save the pair */}
      <input type="text" name="username" value={info.username ?? ""} autoComplete="username" readOnly hidden />
      <Field
        id="password"
        name="password"
        type="password"
        label="New password"
        autoComplete="new-password"
        hint="At least 12 characters. A short sentence works well."
        error={state?.fieldErrors?.password}
        minLength={12}
        maxLength={128}
        required
        autoFocus
      />
      <Field
        id="confirm"
        name="confirm"
        type="password"
        label="Confirm password"
        autoComplete="new-password"
        error={state?.fieldErrors?.confirm}
        required
      />
      <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Set password"}</Button>
    </form>
  );
}
