import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { can } from "@/lib/roles";
import { requirePermission } from "@/lib/session";
import { shortDate } from "@/lib/format";
import { listCards } from "@/server/trivia";
import { Panel } from "@/components/ui/Panel";
import { DeleteCardForm, EditCardForm, NewCardForm, ToggleCardForm } from "./TriviaForms";

export const metadata: Metadata = { title: "Trivia cards" };
export const instant = false; // reads the session; blocks on the server by design (see (portal)/layout.tsx)

/*
  Organizers write the Praetorian Trivia questions here. requirePermission
  404s everyone else, and every action re-checks the role on the server.
*/
export default async function TriviaAdminPage() {
  const actor = await requirePermission(can.manageContent);
  const cards = await listCards(actor);
  const live = cards.filter((c) => c.active).length;
  const off = cards.length - live;

  return (
    <div className="mx-auto flex max-w-[860px] flex-col gap-6">
      <div>
        <Link href="/games" className="inline-flex items-center gap-1 text-[13px] font-medium text-brand hover:underline">
          <ArrowLeft size={14} aria-hidden="true" /> Games
        </Link>
        <h1 className="mt-2 font-serif text-[34px] leading-tight font-semibold">Praetorian Trivia cards</h1>
        <p className="mt-1 text-[14px] text-muted">
          {live} {live === 1 ? "card" : "cards"} in the deck{off > 0 ? `, ${off} switched off` : ""}. Players see the
          question first and the answer only when they tap Reveal.
        </p>
      </div>

      <NewCardForm />

      {cards.length === 0 ? (
        <Panel className="p-6">
          <p className="text-[14px] text-muted">No cards yet. Add the first question above.</p>
        </Panel>
      ) : (
        <ul className="flex flex-col gap-3">
          {cards.map((c) => (
            <li key={c.id}>
              <Panel className="p-5">
                <div className="flex flex-wrap items-center gap-2 text-[12px] text-muted">
                  {c.active ? (
                    <span className="rounded-full bg-success-tint px-2 py-0.5 font-medium text-success">In the deck</span>
                  ) : (
                    <span className="rounded-full bg-line px-2 py-0.5 font-medium text-ink">Switched off</span>
                  )}
                  <span>
                    Added by <span className="capitalize">{c.createdByName}</span> · {shortDate(c.createdAt)}
                  </span>
                </div>
                <p className="mt-2 font-serif text-[19px] leading-snug font-semibold break-words">{c.question}</p>
                <p className="mt-1 text-[14px] break-words">
                  <span className="text-muted">Answer:</span> {c.answer}
                </p>
                <div className="mt-3 flex flex-wrap items-start gap-x-5 gap-y-2 border-t border-line pt-3 [&>details[open]]:basis-full">
                  <EditCardForm key={c.question + c.answer} card={c} />
                  <ToggleCardForm id={c.id} active={c.active} />
                  <DeleteCardForm id={c.id} question={c.question} />
                </div>
              </Panel>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
