"use server";

import { limitAction } from "@/server/rate-limit";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { env } from "@/lib/env";
import { can, ROLES, type Role } from "@/lib/roles";
import { requirePermission } from "@/lib/session";
import { AccountError, createMember, issueLink, nameSchema, usernameSchema } from "@/server/accounts";
import { getTarget, mayManage, setDisabled, setRole } from "@/server/members";

/*
  Every action re-checks permission on the server from the session.
  Nothing from the form is trusted beyond the validated fields.
*/

export type ActionResult = {
  ok: boolean;
  message?: string;
  link?: string;
  linkFor?: string;
  /* Echoed back on error so the form keeps what was typed */
  values?: { name: string; username: string; role: string };
} | null;

const idSchema = z.string().uuid();
const roleSchema = z.enum(ROLES);

function linkUrl(token: string) {
  return `${env.BETTER_AUTH_URL}/setup#${token}`;
}

export async function createMemberAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const actor = await requirePermission(can.manageMembers);
  const blocked = await limitAction("write", actor.id);
  if (blocked) return { ok: false, message: blocked };
  const values = {
    name: String(form.get("name") ?? "").slice(0, 80),
    username: String(form.get("username") ?? "").slice(0, 30),
    role: String(form.get("role") ?? "member"),
  };

  const name = nameSchema.safeParse(values.name);
  if (!name.success) return { ok: false, message: name.error.issues[0]?.message, values };
  const username = usernameSchema.safeParse(values.username);
  if (!username.success) return { ok: false, message: username.error.issues[0]?.message, values };

  let role: Role = "member";
  const requested = form.get("role");
  if (requested && requested !== "member") {
    if (!can.manageRoles(actor.role)) return { ok: false, message: "Only the developer account can create staff accounts.", values };
    const parsed = roleSchema.safeParse(requested);
    if (!parsed.success) return { ok: false, message: "Unknown role.", values };
    role = parsed.data;
  }

  try {
    const created = await createMember({ name: name.data, username: username.data, role, actorId: actor.id });
    const token = await issueLink({ userId: created.id, purpose: "setup", actorId: actor.id });
    revalidatePath("/admin");
    return { ok: true, link: linkUrl(token), linkFor: `${name.data} (@${created.username})` };
  } catch (e) {
    if (e instanceof AccountError) return { ok: false, message: e.message, values };
    throw e;
  }
}

export async function issueLinkAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const actor = await requirePermission(can.manageMembers);
  const blocked = await limitAction("write", actor.id);
  if (blocked) return { ok: false, message: blocked };
  const id = idSchema.safeParse(form.get("userId"));
  if (!id.success) return { ok: false, message: "Unknown member." };

  const target = await getTarget(id.data);
  if (!target) return { ok: false, message: "Unknown member." };
  if (target.disabled) return { ok: false, message: "Enable this account first." };
  if (!mayManage(actor, target)) return { ok: false, message: "Only the developer account can issue links for staff." };
  if (target.id === actor.id) return { ok: false, message: "Change your own password in Password and 2FA." };

  const purpose = target.activatedAt ? "reset" : "setup";
  const token = await issueLink({ userId: target.id, purpose, actorId: actor.id });
  revalidatePath("/admin");
  return { ok: true, link: linkUrl(token), linkFor: target.name };
}

export async function toggleDisabledAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const actor = await requirePermission(can.manageMembers);
  const blocked = await limitAction("write", actor.id);
  if (blocked) return { ok: false, message: blocked };
  const id = idSchema.safeParse(form.get("userId"));
  if (!id.success) return { ok: false, message: "Unknown member." };
  const target = await getTarget(id.data);
  if (!target) return { ok: false, message: "Unknown member." };
  if (target.id === actor.id) return { ok: false, message: "You can't disable your own account." };
  if (!mayManage(actor, target)) return { ok: false, message: "Only the developer account can disable staff." };

  await setDisabled(actor, target.id, !target.disabled);
  revalidatePath("/admin");
  return { ok: true, message: target.disabled ? "Account enabled." : "Account disabled and signed out." };
}

export async function changeRoleAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const actor = await requirePermission(can.manageRoles);
  const blocked = await limitAction("write", actor.id);
  if (blocked) return { ok: false, message: blocked };
  const id = idSchema.safeParse(form.get("userId"));
  const role = roleSchema.safeParse(form.get("role"));
  if (!id.success || !role.success) return { ok: false, message: "Invalid request." };
  const target = await getTarget(id.data);
  if (!target) return { ok: false, message: "Unknown member." };
  if (target.id === actor.id) return { ok: false, message: "You can't change your own role." };
  if (target.role === role.data) return { ok: true };

  await setRole(actor, target.id, target.role, role.data);
  revalidatePath("/admin");
  return { ok: true, message: "Role updated." };
}
