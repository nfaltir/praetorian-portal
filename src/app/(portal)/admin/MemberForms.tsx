"use client";

import { useActionState, useState } from "react";
import { Check, Copy, KeyRound, UserPlus } from "lucide-react";
import { ROLES, roleLabels, type Role } from "@/lib/roles";
import { Alert, Button, Field } from "@/components/ui/Form";
import { Panel } from "@/components/ui/Panel";
import { changeRoleAction, createMemberAction, issueLinkAction, toggleDisabledAction, type ActionResult } from "./actions";

/* Shows a freshly issued link once. It can't be retrieved again later. */
function LinkReveal({ result }: { result: ActionResult }) {
  const [copied, setCopied] = useState(false);
  if (!result?.link) return null;
  return (
    <Alert tone="success">
      <p>
        Link for <span className="font-semibold">{result.linkFor}</span>. Copy it now and send it to them privately. It won&apos;t be shown again.
      </p>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
        <code className="block min-w-0 flex-1 truncate rounded bg-panel px-2 py-1.5 font-mono text-[12px] text-ink">{result.link}</code>
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(result.link!);
            setCopied(true);
          }}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-control border border-success/30 bg-panel px-3 py-1.5 text-[13px] font-medium text-success hover:bg-success-tint"
        >
          {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>
    </Alert>
  );
}

export function AddMemberForm({ canSetRole }: { canSetRole: boolean }) {
  const [state, action, pending] = useActionState(createMemberAction, null);
  const v = state && !state.ok ? state.values : undefined;
  return (
    <Panel className="p-6" labelledBy="add-heading">
      <h2 id="add-heading" className="flex items-center gap-2 font-serif text-[22px] font-semibold">
        <UserPlus size={20} className="text-brand" aria-hidden="true" /> Add a classmate
      </h2>
      <p className="mt-1 text-[14px] text-muted">Creates the account and a one-time link for them to choose a password.</p>
      <form key={state?.link ?? "form"} action={action} className="mt-5 grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_auto]">
        <Field id="new-name" name="name" label="Full name" autoComplete="off" defaultValue={v?.name} required />
        <Field id="new-username" name="username" label="Username" autoComplete="off" autoCapitalize="none" spellCheck={false} hint="e.g. jsantos" defaultValue={v?.username} required />
        {canSetRole && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="new-role" className="text-[14px] font-medium">Role</label>
            <select id="new-role" name="role" defaultValue={v?.role ?? "member"} className="h-11 rounded-control border border-line bg-panel px-3 text-[15px]">
              {ROLES.map((r) => (
                <option key={r} value={r}>{roleLabels[r]}</option>
              ))}
            </select>
          </div>
        )}
        <Button type="submit" disabled={pending} className="lg:mt-[30px]">{pending ? "Creating..." : "Create account"}</Button>
      </form>
      <div className="mt-4 flex flex-col gap-3">
        {state && !state.ok && <Alert tone="error">{state.message}</Alert>}
        <LinkReveal result={state} />
      </div>
    </Panel>
  );
}

export function MemberRowActions({
  member,
  canSetRole,
}: {
  member: { id: string; name: string; role: Role; activated: boolean; disabled: boolean };
  canSetRole: boolean;
}) {
  const [linkState, linkAction, linkPending] = useActionState(issueLinkAction, null);
  const [toggleState, toggleAction, togglePending] = useActionState(toggleDisabledAction, null);
  const [roleState, roleAction, rolePending] = useActionState(changeRoleAction, null);
  const message = [linkState, toggleState, roleState].find((s) => s && !s.ok)?.message;

  return (
    <div className="flex flex-col gap-2 lg:items-end">
      <div className="flex flex-wrap gap-2">
        {!member.disabled && (
          <form action={linkAction}>
            <input type="hidden" name="userId" value={member.id} />
            <Button type="submit" variant="secondary" disabled={linkPending} className="h-9 px-3 text-[13px]">
              <KeyRound size={14} aria-hidden="true" />
              {member.activated ? "Reset link" : "New setup link"}
            </Button>
          </form>
        )}
        {canSetRole && !member.disabled && (
          <form action={roleAction} className="flex gap-1">
            <input type="hidden" name="userId" value={member.id} />
            <label className="sr-only" htmlFor={`role-${member.id}`}>Role for {member.name}</label>
            <select id={`role-${member.id}`} name="role" defaultValue={member.role} className="h-9 rounded-control border border-line bg-panel px-2 text-[13px]">
              {ROLES.map((r) => (
                <option key={r} value={r}>{roleLabels[r]}</option>
              ))}
            </select>
            <Button type="submit" variant="secondary" disabled={rolePending} className="h-9 px-3 text-[13px]">Save</Button>
          </form>
        )}
        <form
          action={toggleAction}
          onSubmit={(e) => {
            if (!member.disabled && !confirm(`Disable ${member.name}? They will be signed out and unable to sign in.`)) e.preventDefault();
          }}
        >
          <input type="hidden" name="userId" value={member.id} />
          <Button type="submit" variant={member.disabled ? "secondary" : "danger"} disabled={togglePending} className="h-9 px-3 text-[13px]">
            {member.disabled ? "Enable" : "Disable"}
          </Button>
        </form>
      </div>
      {message && <p className="text-[13px] text-danger" role="alert">{message}</p>}
      {roleState?.ok && roleState.message && <p className="text-[13px] text-success" role="status">{roleState.message}</p>}
      <div className="w-full lg:max-w-md"><LinkReveal result={linkState} /></div>
    </div>
  );
}
