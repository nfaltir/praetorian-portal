"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowLeft, Eye, Shuffle, Sparkles, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { buildDeck, outcome, resolve, type DeckQuestion, type Draw } from "@/lib/trivia-game";
import { CardBack, CardFront } from "./CardArt";

/*
  Praetorian Trivia, played on one phone passed around the circle.
  Everything runs in the browser: no network needed once the page loads.
  The deck position is kept in sessionStorage, so an accidental refresh
  (easy to do mid-swipe) picks up where the game left off.
  The screen is kept awake while a game is running, where supported.
*/

type Phase = "intro" | "pass" | "shuffling" | "facedown" | "card" | "answer" | "result";
type Saved = { v: 1; order: string[]; pos: number };

const STORE = "praetorian-trivia";
const SHUFFLE_STEPS = 8;
const SHUFFLE_MS = 140;

/* Reads the saved game during render. The server always reports "nothing
   saved", so the first paint matches and the Continue button appears after. */
const noSubscription = () => () => {};
function readSaved(): string | null {
  try {
    return sessionStorage.getItem(STORE);
  } catch {
    return null;
  }
}

function parseSaved(raw: string | null, questions: DeckQuestion[]): Saved | null {
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as Saved;
    if (!s || s.v !== 1 || !Array.isArray(s.order) || typeof s.pos !== "number") return null;
    const known = (k: string) => k.startsWith("a:") || questions.some((q) => `q:${q.id}` === k);
    return s.order.some(known) ? s : null;
  } catch {
    return null;
  }
}

function save(s: Saved | null) {
  try {
    if (s) sessionStorage.setItem(STORE, JSON.stringify(s));
    else sessionStorage.removeItem(STORE);
  } catch {
    // Private mode or storage blocked: the game still works, it just can't resume
  }
}

const primary =
  "inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-brand px-6 text-[17px] font-semibold text-on-dark transition-colors hover:bg-brand-ink disabled:opacity-50";
const secondary =
  "inline-flex h-14 w-full items-center justify-center gap-2 rounded-full border border-line bg-panel px-6 text-[17px] font-semibold text-ink transition-colors hover:bg-page";

export function TriviaGame({ questions }: { questions: DeckQuestion[] }) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [order, setOrder] = useState<string[]>([]);
  const [pos, setPos] = useState(0);
  const [draw, setDraw] = useState<Draw | null>(null);
  const [hit, setHit] = useState<boolean | null>(null);
  const [step, setStep] = useState(0);
  const [reshuffled, setReshuffled] = useState(false);
  const [showActionAnswer, setShowActionAnswer] = useState(false);
  const live = useRef<HTMLParagraphElement>(null);

  // Offer to continue a game interrupted by a refresh
  const savedRaw = useSyncExternalStore(noSubscription, readSaved, () => null);
  const resumable = useMemo(() => parseSaved(savedRaw, questions), [savedRaw, questions]);

  // Keep the saved position current while a game is running
  useEffect(() => {
    if (phase !== "intro" && order.length > 0) save({ v: 1, order, pos });
  }, [phase, order, pos]);

  // Keep the screen awake during a game (iOS 16.4+, Chrome, Edge)
  useEffect(() => {
    if (phase === "intro" || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const acquire = async () => {
      try {
        const l = await navigator.wakeLock.request("screen");
        if (cancelled) void l.release();
        else lock = l;
      } catch {
        // Denied or unsupported: the game works without it
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void acquire();
    };
    void acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release();
    };
  }, [phase === "intro"]); // eslint-disable-line react-hooks/exhaustive-deps

  // Shuffle animation, then draw the next card
  useEffect(() => {
    if (phase !== "shuffling") return;
    const steps = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 1 : SHUFFLE_STEPS;
    let n = 0;
    const timer = window.setInterval(() => {
      n += 1;
      setStep(n);
      if (n < steps) return;
      window.clearInterval(timer);

      let deck = order;
      let at = pos;
      let next: Draw | null = null;
      let fresh = false;
      // Skip cards deleted since the deck was built; start a new deck when this one runs out
      for (let guard = 0; guard < deck.length + 2 && !next; guard++) {
        if (at >= deck.length) {
          deck = buildDeck(questions);
          at = 0;
          fresh = true;
          if (deck.length === 0) break;
        }
        next = resolve(deck[at] ?? "", questions);
        at += 1;
      }
      setOrder(deck);
      setPos(at);
      setReshuffled(fresh && pos > 0);
      setDraw(next);
      setHit(null);
      setShowActionAnswer(false);
      setPhase(next ? "facedown" : "intro");
    }, SHUFFLE_MS);
    return () => window.clearInterval(timer);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  function start(resume: Saved | null) {
    if (resume) {
      setOrder(resume.order);
      setPos(resume.pos);
    } else {
      setOrder(buildDeck(questions));
      setPos(0);
    }
    setReshuffled(false);
    setPhase("pass");
  }

  function endGame() {
    save(null);
    setOrder([]);
    setPos(0);
    setDraw(null);
    setPhase("intro");
  }

  function announce(text: string) {
    if (live.current) live.current.textContent = text;
  }

  function flip() {
    if (phase !== "facedown" || !draw) return;
    setPhase("card");
    announce(
      draw.kind === "question"
        ? `Question: ${draw.card.question}${draw.twist ? ` Twist, ${draw.twist.name}: ${draw.twist.rule}` : ""}`
        : `${draw.card.title}. ${draw.card.text}`,
    );
  }

  function judge(correct: boolean) {
    if (draw?.kind !== "question") return;
    setHit(correct);
    setPhase("result");
    announce(`${correct ? "Got it." : "Missed it."} ${outcome(draw, correct)}`);
  }

  const total = order.length;
  const flipped = phase === "card" || phase === "answer" || phase === "result";

  /* ---------- Intro ---------- */
  if (phase === "intro") {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <Link href="/games" className="inline-flex items-center gap-1 text-[13px] font-medium text-brand hover:underline">
          <ArrowLeft size={14} aria-hidden="true" /> Games
        </Link>
        <div>
          <h1 className="font-serif text-[38px] leading-tight font-semibold">Praetorian Trivia</h1>
          <p className="mt-1 text-[15px] text-muted">You&apos;re the moderator. Gather everyone in a circle.</p>
        </div>

        <ol className="flex flex-col gap-2.5 text-[15px] leading-relaxed">
          <li><span className="font-semibold">1.</span> Hand the phone to the first player. They tap Shuffle and draw.</li>
          <li><span className="font-semibold">2.</span> They answer out loud, then tap Reveal. The circle decides: got it or missed it.</li>
          <li><span className="font-semibold">3.</span> Miss it and you drink. Get it right and it&apos;s your call.</li>
          <li><span className="font-semibold">4.</span> Watch for twists and action cards, then pass the phone on.</li>
        </ol>

        <p className="rounded-control border border-accent/40 bg-accent-tint px-4 py-3 text-[14px] leading-relaxed">
          <span className="font-semibold">House rule:</span> a drink means a sip of whatever you&apos;re having. Water
          counts, and nobody has to drink.
        </p>

        {questions.length === 0 ? (
          <p className="text-[15px] text-muted">No questions in the deck yet. Organizers can add them in Staff Admin.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {resumable && (
              <button type="button" className={primary} onClick={() => start(resumable)}>
                Continue the last game
              </button>
            )}
            <button type="button" className={resumable ? secondary : primary} onClick={() => start(null)}>
              {resumable ? "Start a new game" : "Start game"}
            </button>
            <p className="text-center text-[13px] text-muted">
              {questions.length} {questions.length === 1 ? "question" : "questions"} in the deck
            </p>
          </div>
        )}
      </div>
    );
  }

  /* ---------- Game ---------- */
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5">
      <p ref={live} className="sr-only" aria-live="polite" />

      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium tracking-[0.15em] text-muted uppercase">Praetorian Trivia</p>
        <button
          type="button"
          onClick={endGame}
          className="inline-flex items-center gap-1 text-[13px] font-medium text-muted hover:text-ink hover:underline"
        >
          <X size={14} aria-hidden="true" /> End game
        </button>
      </div>

      {/* Card stage */}
      <div className="relative mx-auto aspect-[3/4] w-full max-w-[340px] [perspective:1400px]">
        {(phase === "pass" || phase === "shuffling") &&
          [0, 1, 2].map((i) => {
            const moving = phase === "shuffling";
            const x = moving ? (((step * 37 + i * 53) % 80) - 40) : (i - 1) * 4;
            const r = moving ? (((step * 17 + i * 29) % 20) - 10) : (i - 1) * 2;
            return (
              <CardBack
                key={i}
                className="absolute inset-0 transition-transform duration-150 ease-out"
                style={{ transform: `translateX(${x}px) rotate(${r}deg)` }}
              />
            );
          })}

        {draw && phase !== "pass" && phase !== "shuffling" && (
          <div
            className={`absolute inset-0 transition-transform duration-500 [transform-style:preserve-3d] ${flipped ? "[transform:rotateY(180deg)]" : ""}`}
            onClick={flip}
          >
            <CardBack className="absolute inset-0 cursor-pointer [backface-visibility:hidden]" />
            <CardFront kind={draw.kind} className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
              {draw.kind === "question" ? (
                <>
                  <p className="text-center text-[12px] font-semibold tracking-[0.18em] text-brand uppercase">Trivia</p>
                  {draw.twist && (
                    <div className="mt-3 rounded-control border border-accent/50 bg-accent-tint px-3 py-2">
                      <p className="flex items-center gap-1.5 text-[13px] font-semibold">
                        <Sparkles size={14} className="text-accent" aria-hidden="true" /> {draw.twist.name}
                      </p>
                      <p className="mt-0.5 text-[13px] leading-snug">{draw.twist.rule}</p>
                    </div>
                  )}
                  <p className="mt-4 font-serif text-[26px] leading-snug font-semibold break-words">{draw.card.question}</p>
                  {(phase === "answer" || phase === "result") && (
                    <div className="mt-auto border-t border-line pt-4">
                      <p className="text-[12px] font-semibold tracking-[0.18em] text-muted uppercase">Answer</p>
                      <p className="mt-1 text-[20px] leading-snug font-semibold break-words text-brand">{draw.card.answer}</p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <p className="text-center text-[12px] font-semibold tracking-[0.18em] text-brand uppercase">Action card</p>
                  <p className="mt-4 font-serif text-[30px] leading-tight font-semibold">{draw.card.title}</p>
                  <p className="mt-3 text-[18px] leading-relaxed">{draw.card.text}</p>
                  {showActionAnswer && draw.card.answer && (
                    <p className="mt-auto border-t border-line pt-4 text-[18px] font-semibold text-brand">{draw.card.answer}</p>
                  )}
                </>
              )}
            </CardFront>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-3">
        {phase === "pass" && (
          <>
            <p className="text-center font-serif text-[24px] font-semibold">Pass the phone</p>
            <p className="-mt-2 text-center text-[14px] text-muted">
              {reshuffled ? "Every card has been played, so the deck was reshuffled. " : ""}
              Next player: tap Shuffle to draw.
            </p>
            <button type="button" className={primary} onClick={() => setPhase("shuffling")}>
              <Shuffle size={20} aria-hidden="true" /> Shuffle and draw
            </button>
            {total > 0 && <p className="text-center text-[13px] text-muted">Card {Math.min(pos + 1, total)} of {total}</p>}
          </>
        )}

        {phase === "shuffling" && <p className="text-center text-[15px] text-muted" aria-live="polite">Shuffling...</p>}

        {phase === "facedown" && (
          <button type="button" className={primary} onClick={flip}>
            Flip the card
          </button>
        )}

        {phase === "card" && draw?.kind === "question" && (
          <>
            <p className="text-center text-[14px] text-muted">Answer out loud first, then reveal.</p>
            <button type="button" className={primary} onClick={() => setPhase("answer")}>
              <Eye size={20} aria-hidden="true" /> Reveal answer
            </button>
          </>
        )}

        {phase === "answer" && (
          <>
            <p className="text-center text-[14px] text-muted">The circle decides.</p>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" className={primary} onClick={() => judge(true)}>
                <ThumbsUp size={20} aria-hidden="true" /> Got it
              </button>
              <button type="button" className={secondary} onClick={() => judge(false)}>
                <ThumbsDown size={20} aria-hidden="true" /> Missed it
              </button>
            </div>
          </>
        )}

        {phase === "result" && draw?.kind === "question" && hit !== null && (
          <>
            <div className="rounded-panel border border-line bg-panel px-5 py-4 text-center">
              <p className={`font-serif text-[30px] font-semibold ${hit ? "text-success" : "text-brand"}`}>
                {hit ? "Nice!" : "Drink!"}
              </p>
              <p className="mt-1 text-[17px] leading-snug">{outcome(draw, hit)}</p>
            </div>
            <button type="button" className={primary} onClick={() => setPhase("pass")}>
              Pass the phone
            </button>
          </>
        )}

        {phase === "card" && draw?.kind === "action" && (
          <>
            {draw.card.answer && !showActionAnswer && (
              <button type="button" className={secondary} onClick={() => setShowActionAnswer(true)}>
                <Eye size={20} aria-hidden="true" /> Show the answer
              </button>
            )}
            <button type="button" className={primary} onClick={() => setPhase("pass")}>
              Done, pass the phone
            </button>
          </>
        )}

        <p className="pt-2 text-center text-[12px] text-muted">Sip, don&apos;t chug. Water counts.</p>
      </div>
    </div>
  );
}
