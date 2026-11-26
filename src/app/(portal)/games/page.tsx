import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Dice5, Gift, Layers, PartyPopper, Settings2, Smartphone, Spade, Star, Users } from "lucide-react";
import { can } from "@/lib/roles";
import { requireUser } from "@/lib/session";
import { loadDeck } from "@/server/trivia";
import { CardBack } from "./praetorian-trivia/CardArt";

export const metadata: Metadata = { title: "Games" };
export const instant = false; // reads the session; blocks on the server by design (see (portal)/layout.tsx)

/*
  GAMES: the one page allowed to break the portal's calm template.
  The scene is a file folder that opens on arrival: the flap tips forward
  and the game cards rise out of it one after another. Praetorian Trivia
  uses its real card back as box art; wrapped cards tease games to come.

  Motion is CSS only (Tailwind starting: = @starting-style, plus hover),
  so there's no JavaScript and the site's Reduce Motion rule simply shows
  the opened folder. Decoration is hidden from screen readers; the info
  strip below carries the same content as text.
*/

/* Doodles printed on the folder flap: [icon, position, size, rotation] */
const DOODLES = [
  [Dice5, "left-[6%] top-[22%]", 30, "-rotate-12"],
  [Spade, "left-[24%] bottom-[16%]", 22, "rotate-12"],
  [Star, "left-[46%] top-[18%]", 18, "rotate-6"],
  [PartyPopper, "right-[30%] bottom-[18%]", 28, "-rotate-6"],
  [Star, "right-[18%] top-[26%]", 14, "-rotate-12"],
  [Dice5, "right-[5%] bottom-[20%]", 24, "rotate-12"],
] as const;

function WrappedCard({ hue, className }: { hue: string; className: string }) {
  return (
    <div
      className={`absolute bottom-[16%] aspect-[5/7] rounded-[18px] p-1.5 shadow-[0_18px_36px_-16px_rgb(40_20_60/0.45)] transition-[translate,rotate] duration-700 ease-out ${hue} ${className}`}
      aria-hidden="true"
    >
      <div className="relative size-full overflow-hidden rounded-[13px] border border-white/40">
        {/* Ribbon and bow: still wrapped, opening soon */}
        <div className="absolute inset-y-0 left-1/2 w-5 -translate-x-1/2 bg-white/80" />
        <div className="absolute inset-x-0 top-[38%] h-5 bg-white/80" />
        <Gift size={34} strokeWidth={1.75} className="absolute top-[38%] left-1/2 -translate-x-1/2 -translate-y-[85%] text-white drop-shadow" />
        <p className="absolute inset-x-0 bottom-4 text-center font-serif text-[44px] leading-none font-bold text-white/90">?</p>
      </div>
    </div>
  );
}

export default async function GamesPage() {
  const viewer = await requireUser();
  const isOrganizer = can.manageContent(viewer.role);
  const deck = await loadDeck();

  return (
    <div className="mx-auto flex max-w-[1040px] flex-col gap-8">
      <header className="text-center">
        <p className="text-[12px] font-semibold tracking-[0.3em] text-brand uppercase">Praetorianz</p>
        <h1 className="mt-1 font-serif text-[46px] leading-none font-semibold sm:text-[60px]">Game Night</h1>
        <p className="mx-auto mt-3 max-w-md text-[15px] text-muted">
          Pick a game, gather the circle and pass the phone.
        </p>
      </header>

      {/* The folder */}
      <div className="relative mx-auto h-[440px] w-full max-w-[940px] [perspective:1200px] sm:h-[460px]" aria-hidden="true">
        {/* Back panel with its tab */}
        <div className="absolute top-0 left-6 flex h-14 w-44 items-start justify-center rounded-t-[18px] bg-[#ffc76b] pt-3 sm:left-10 sm:w-52">
          <span className="text-[13px] font-bold tracking-[0.35em] text-[#7a3d12] uppercase">Games</span>
        </div>
        <div className="absolute inset-x-0 top-11 bottom-0 rounded-[28px] bg-linear-to-br from-[#ffc76b] via-[#ffa76b] to-[#ff8577] shadow-[inset_0_2px_0_rgb(255_255_255/0.45),0_30px_60px_-30px_rgb(140_60_20/0.55)]">
          <div className="absolute inset-3 rounded-[22px] border-2 border-dashed border-white/35" />
        </div>

        {/* Cards rising out of the folder */}
        <Link
          href="/games/praetorian-trivia"
          tabIndex={-1}
          className="group absolute bottom-[12%] left-[6%] z-10 aspect-[5/7] w-[52%] -rotate-3 transition-[translate,rotate] duration-700 ease-out hover:-translate-y-6 hover:-rotate-6 starting:translate-y-[55%] sm:bottom-[16%] sm:left-[12%] sm:w-[25%]"
        >
          <CardBack className="size-full" />
          <span className="absolute -top-3 -right-3 rotate-12 rounded-full bg-white px-3 py-1 text-[12px] font-bold tracking-wide text-brand shadow-md transition-transform group-hover:rotate-0">
            PLAY
          </span>
        </Link>
        <WrappedCard
          hue="bg-linear-to-br from-[#a78bfa] to-[#6d5dfc]"
          className="left-[58%] w-[36%] rotate-6 delay-150 starting:translate-y-[60%] sm:left-[42%] sm:w-[20%] sm:-rotate-2"
        />
        <WrappedCard
          hue="bg-linear-to-br from-[#5eead4] to-[#14b8a6]"
          className="hidden w-[20%] rotate-6 delay-300 starting:translate-y-[60%] sm:left-[66%] sm:block"
        />

        {/* Front flap: tips forward as the folder opens */}
        <div className="absolute inset-x-2 bottom-0 z-20 h-[34%] origin-bottom rounded-[26px] sm:h-[44%] bg-linear-to-br from-[#8ff0dc] via-[#5fd4d0] to-[#41b6d8] shadow-[0_-12px_30px_-18px_rgb(20_80_90/0.55),inset_0_2px_0_rgb(255_255_255/0.5)] transition-transform duration-[900ms] ease-out [transform:rotateX(-10deg)] starting:[transform:rotateX(0deg)]">
          {DOODLES.map(([Icon, pos, size, rot], i) => (
            <Icon key={i} size={size} strokeWidth={1.75} className={`absolute text-white/55 ${pos} ${rot}`} />
          ))}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-2 rounded-[14px] bg-white px-6 py-3 text-center shadow-[0_10px_24px_-12px_rgb(20_60_70/0.45)]">
            <p className="font-serif text-[22px] leading-tight font-semibold text-[#1f3b44] italic sm:text-[26px]">Game Night</p>
            <p className="text-[10px] font-semibold tracking-[0.3em] text-[#3f7f8c] uppercase">Class of 2010</p>
          </div>
        </div>
      </div>

      {/* The same content as text, and the real controls */}
      <section
        aria-labelledby="trivia-heading"
        className="flex flex-col gap-5 rounded-panel border border-line bg-panel p-6 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-[0.25em] text-brand uppercase">Now playing</p>
          <h2 id="trivia-heading" className="mt-1 font-serif text-[28px] leading-tight font-semibold">Praetorian Trivia</h2>
          <p className="mt-1 max-w-xl text-[14px] leading-relaxed text-muted">
            Class trivia with a twist. Draw a card, answer in front of the circle. Miss it and you drink; get it right and
            it&apos;s your call. Adults only, drink responsibly.
          </p>
          <ul className="mt-3 flex flex-wrap gap-2 text-[12px] font-medium">
            <li className="inline-flex items-center gap-1.5 rounded-full bg-page px-3 py-1"><Users size={13} aria-hidden="true" /> 3+ players</li>
            <li className="inline-flex items-center gap-1.5 rounded-full bg-page px-3 py-1"><Smartphone size={13} aria-hidden="true" /> One phone</li>
            <li className="inline-flex items-center gap-1.5 rounded-full bg-page px-3 py-1">
              <Layers size={13} aria-hidden="true" /> {deck.length} {deck.length === 1 ? "question" : "questions"}
            </li>
          </ul>
        </div>
        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:w-56">
          <Link
            href="/games/praetorian-trivia"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-brand px-6 text-[15px] font-semibold text-on-dark transition-colors hover:bg-brand-ink"
          >
            Play <ArrowRight size={17} aria-hidden="true" />
          </Link>
          {isOrganizer && (
            <Link href="/admin/trivia" className="inline-flex items-center justify-center gap-1 text-[13px] font-medium text-brand hover:underline">
              <Settings2 size={13} aria-hidden="true" /> Manage cards
            </Link>
          )}
        </div>
      </section>

      <p className="text-center text-[13px] text-muted">More games are on the way. Ideas? Tell the organizers.</p>
    </div>
  );
}
