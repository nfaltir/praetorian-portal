"use server";

import { clientIp, limitAction } from "@/server/rate-limit";
import { redirect } from "next/navigation";
import { z } from "zod";
import { AccountError, inspectLink, passwordSchema, redeemLink } from "@/server/accounts";

/*
  The token arrives in the URL fragment (#...), which browsers never send
  to the server or put in logs. The page reads it client-side and passes
  it here.
*/

const tokenSchema = z.string().min(20).max(100);

export async function checkLinkAction(token: string) {
  if (await limitAction("setupLink", await clientIp())) return null;
  const parsed = tokenSchema.safeParse(token);
  if (!parsed.success) return null;
  const link = await inspectLink(parsed.data);
  return link ? { name: link.name, username: link.username, purpose: link.purpose } : null;
}

export type SetupState = { error?: string; fieldErrors?: { password?: string; confirm?: string } } | null;

export async function redeemLinkAction(_prev: SetupState, form: FormData): Promise<SetupState> {
  const blocked = await limitAction("setupLink", await clientIp());
  if (blocked) return { error: blocked };
  const token = tokenSchema.safeParse(form.get("token"));
  if (!token.success) return { error: "This link is invalid or has expired. Ask an organizer for a new one." };

  const password = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");
  const pw = passwordSchema.safeParse(password);
  if (!pw.success) return { fieldErrors: { password: pw.error.issues[0]?.message } };
  if (password !== confirm) return { fieldErrors: { confirm: "Passwords don't match" } };

  const link = await inspectLink(token.data);
  try {
    await redeemLink(token.data, password);
  } catch (e) {
    if (e instanceof AccountError) return { error: e.message };
    throw e;
  }
  redirect(`/login?done=${link?.purpose === "reset" ? "reset" : "setup"}`);
}
