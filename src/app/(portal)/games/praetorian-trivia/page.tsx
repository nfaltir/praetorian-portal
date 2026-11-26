import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { loadDeck } from "@/server/trivia";
import { TriviaGame } from "./TriviaGame";

export const metadata: Metadata = { title: "Praetorian Trivia" };
export const instant = false; // reads the session; blocks on the server by design (see (portal)/layout.tsx)

/*
  Any signed-in classmate can host a game. The deck (active cards only,
  question and answer) is sent once; the game then runs in the browser.
*/
export default async function PraetorianTriviaPage() {
  await requireUser();
  const deck = await loadDeck();
  return <TriviaGame questions={deck} />;
}
