"use server";

import { limitAction } from "@/server/rate-limit";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { site } from "@/config/site";
import { can } from "@/lib/roles";
import { requirePermission, requireUser } from "@/lib/session";
import { castVote, closePoll, createPoll, deletePoll, PollError } from "@/server/polls";

/*
  Polls server actions. Each re-checks on the server who the caller is
  (organizer actions use requirePermission, voting needs any signed-in
  classmate), then hands off to src/server/polls.ts, which validates again.
*/

type PollValues = { question: string; details: string; options: string[]; closesAt: string; showResults: string };

export type PollActionResult = {
  ok: boolean;
  message?: string;
  /* Echoed back on error so the form keeps what was typed */
  values?: PollValues;
} | null;

function field(form: FormData, name: string, max: number) {
  return String(form.get(name) ?? "").slice(0, max);
}

/*
  The form's date/time input has no time zone. It means class time
  (site.timeZone), not the server's or the organizer's browser zone.
  Works for any IANA zone, including ones with daylight saving.
*/
function classTimeToDate(local: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m.map(Number);
  const asUtc = Date.UTC(y!, mo! - 1, d!, h!, mi!);

  const offsetAt = (t: number) => {
    const p = Object.fromEntries(
      new Intl.DateTimeFormat("en-US", {
        timeZone: site.timeZone,
        hourCycle: "h23",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
        .formatToParts(new Date(t))
        .map((x) => [x.type, x.value]),
    );
    return Date.UTC(+p.year!, +p.month! - 1, +p.day!, +p.hour!, +p.minute!) - t;
  };

  const first = asUtc - offsetAt(asUtc);
  return new Date(asUtc - offsetAt(first));
}

function readPoll(form: FormData): PollValues {
  return {
    // A little over the limits so the server, not truncation, reports "too long"
    question: field(form, "question", 300),
    details: field(form, "details", 1200),
    options: form.getAll("option").slice(0, 12).map((v) => String(v).slice(0, 200)),
    closesAt: field(form, "closesAt", 20),
    showResults: field(form, "showResults", 20),
  };
}

function refresh() {
  revalidatePath("/polls");
  revalidatePath("/");
}

async function run(fn: () => Promise<string>, values?: PollValues): Promise<PollActionResult> {
  try {
    const message = await fn();
    refresh();
    return { ok: true, message };
  } catch (e) {
    if (e instanceof PollError) return { ok: false, message: e.message, values };
    throw e;
  }
}

export async function createPollAction(_prev: PollActionResult, form: FormData): Promise<PollActionResult> {
  const actor = await requirePermission(can.manageContent);
  const blocked = await limitAction("write", actor.id);
  if (blocked) return { ok: false, message: blocked };
  const values = readPoll(form);
  const result = await run(async () => {
    const closesAt = classTimeToDate(values.closesAt);
    if (!closesAt) throw new PollError("Pick when the poll closes.");
    await createPoll(actor, {
      question: values.question,
      details: values.details,
      options: values.options,
      closesAt,
      showResults: values.showResults as "after_vote" | "after_close", // zod rejects anything else
    });
    return "Poll posted.";
  }, values);
  // Outside run(): redirect works by throwing, and run() must not catch it
  if (result?.ok) redirect("/polls");
  return result;
}

export async function closePollAction(_prev: PollActionResult, form: FormData): Promise<PollActionResult> {
  const actor = await requirePermission(can.manageContent);
  const blocked = await limitAction("write", actor.id);
  if (blocked) return { ok: false, message: blocked };
  const id = field(form, "id", 64);
  return run(async () => {
    await closePoll(actor, id);
    return "Poll closed. Results are now visible to everyone.";
  });
}

export async function deletePollAction(_prev: PollActionResult, form: FormData): Promise<PollActionResult> {
  const actor = await requirePermission(can.manageContent);
  const blocked = await limitAction("write", actor.id);
  if (blocked) return { ok: false, message: blocked };
  const id = field(form, "id", 64);
  return run(async () => {
    await deletePoll(actor, id);
    return "Poll deleted.";
  });
}

export async function voteAction(_prev: PollActionResult, form: FormData): Promise<PollActionResult> {
  const actor = await requireUser();
  const blocked = await limitAction("vote", actor.id);
  if (blocked) return { ok: false, message: blocked };
  const pollId = field(form, "pollId", 64);
  const optionId = field(form, "optionId", 64);
  return run(async () => {
    if (!optionId) throw new PollError("Pick one of the choices.");
    await castVote(actor, pollId, optionId);
    return "Vote saved. You can change it until the poll closes.";
  });
}
