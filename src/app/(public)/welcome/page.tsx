import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, CalendarHeart, HandCoins, KeyRound, Lock, Megaphone, Music, Star, UserCheck, Vote } from "lucide-react";
import { site, classLabel } from "@/config/site";
import { Emblem } from "@/components/shell/Emblem";
import { Footer } from "@/components/shell/Footer";
import { SnowScene } from "@/components/season/SnowScene";
import { SEASON } from "@/lib/season";

export const metadata: Metadata = { title: "Welcome" };

/*
  Public landing page for classmates (praetorianz.com sends signed-out
  visitors here). Fully static on purpose:
  - no database reads, no session reads: nothing about any classmate,
    payment, poll or RSVP can appear on a page anyone can open;
  - the contributions preview uses hard-coded SAMPLE numbers, labelled
    as an example, never real ledger data;
  - no sign-up form: accounts stay invite-only, set up by organizers.
  No chart library: the preview is plain HTML/CSS, so the page ships no
  extra JavaScript. Bars grow in with CSS @starting-style (browsers that
  don't support it just show them at full size).
*/

const FEATURES = [
  { icon: Megaphone, title: "Every update in one place", text: "Planning news from the organizers, so nothing gets lost in a long group chat." },
  { icon: Vote, title: "Help decide", text: "Vote on dates, venues and ideas. Ballots are private; only totals are shown." },
  { icon: UserCheck, title: "See who's coming", text: "The RSVP list, guests and what everyone is bringing to the table." },
  { icon: HandCoins, title: "Open books", text: "Every contribution is recorded and visible to the class." },
  { icon: Music, title: "The class soundtrack", text: "Playlists from our school years on Spotify, YouTube and SoundCloud." },
  { icon: Lock, title: "Private by design", text: "Only classmates with an account can see inside. No ads, no strangers." },
];

/* SAMPLE data for the preview. Not real payments. */
const SAMPLE_TARGET = 400;
const SAMPLE = [
  { name: "Marson", given: 400 },
  { name: "Jace", given: 250 },
  { name: "John", given: 120 },
  { name: "Josh", given: 520 },
];

const PLAN = [
  "Find everyone from the Class of 2010.",
  "Agree on a date. (The hardest part.)",
  "Fund it together, with every dollar in plain sight.",
  `Reunite in ${site.reunionPlace}, ${site.reunionYear}.`,
  "Take over the FSM, the RMI and Palau.",
];

const STEPS = [
  { n: "1", title: "Ask an organizer", text: "Message one of the organizers or ask in our class Facebook group." },
  { n: "2", title: "Get your setup link", text: "They'll send you a personal link to choose your password." },
  { n: "3", title: "Sign in", text: "Use the username they gave you. That's it." },
];

const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

function ContributionsPreview() {
  const goal = SAMPLE_TARGET * SAMPLE.length;
  const collected = SAMPLE.reduce((s, m) => s + m.given, 0);
  const classPct = Math.round((collected / goal) * 100);

  return (
    <figure className="rounded-[22px] border border-white/80 bg-white/80 p-6 shadow-[0_24px_60px_-28px_rgb(60_45_20/0.45)] ring-1 ring-black/5 sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[12px] font-medium text-muted">Class goal</p>
          <p className="figures font-serif text-[34px] leading-none font-semibold text-ink">
            {usd(collected)} <span className="text-[18px] text-muted">of {usd(goal)}</span>
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-amber-900 uppercase">
          Example
        </span>
      </div>

      <div className="mt-4 h-3 overflow-hidden rounded-full bg-black/5" aria-hidden="true">
        <div
          className="h-full origin-left rounded-full bg-linear-to-r from-[#1e3a5f] to-[#3b6ea5] transition-transform duration-1000 ease-out starting:scale-x-0"
          style={{ width: `${Math.min(100, classPct)}%` }}
        />
      </div>
      <p className="figures mt-2 text-[12px] text-muted">{classPct}% of the class goal</p>

      <ul className="mt-6 flex flex-col gap-4">
        {SAMPLE.map((m, i) => {
          const pct = Math.round((m.given / SAMPLE_TARGET) * 100);
          const over = m.given > SAMPLE_TARGET;
          return (
            <li key={m.name}>
              <div className="flex items-baseline justify-between gap-3 text-[14px]">
                <span className="flex items-center gap-1.5 font-medium text-ink">
                  {m.name}
                  {over && <Star size={13} className="fill-amber-400 text-amber-500" aria-label="Gave above target" />}
                </span>
                <span className="figures text-[13px] text-muted">
                  {usd(m.given)} of {usd(SAMPLE_TARGET)}
                </span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-black/5" aria-hidden="true">
                <div
                  className={`h-full origin-left rounded-full transition-transform duration-1000 ease-out starting:scale-x-0 ${
                    over ? "bg-linear-to-r from-amber-400 to-amber-500" : pct >= 100 ? "bg-emerald-500" : "bg-[#3b6ea5]"
                  }`}
                  style={{ width: `${Math.min(100, pct)}%`, transitionDelay: `${150 + i * 120}ms` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
      <figcaption className="mt-5 border-t border-black/10 pt-4 text-[12px] text-muted">
        Sample numbers for illustration. Inside the portal, every classmate sees the real totals.
      </figcaption>
    </figure>
  );
}

/* ---------- Christmas greeting ribbon ---------- */

/* A fly agaric, the red-and-white mushroom of European Christmas ornaments */
function Mushroom({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
      <path d="M9.5 13.5h5l.8 7.2a1.4 1.4 0 0 1-1.4 1.6h-3.8a1.4 1.4 0 0 1-1.4-1.6z" fill="#f6ead6" stroke="#b08968" strokeWidth="0.9" />
      <path d="M2.5 13.2C2.5 7.6 6.8 3.5 12 3.5s9.5 4.1 9.5 9.7c0 .7-.5 1.1-1.2 1.1H3.7c-.7 0-1.2-.4-1.2-1.1z" fill="#d3011c" />
      <g fill="#fff">
        <circle cx="8" cy="8.6" r="1.4" />
        <circle cx="13.2" cy="6.6" r="1.1" />
        <circle cx="16.6" cy="10.2" r="1.5" />
        <circle cx="10.6" cy="11.4" r="0.9" />
        <circle cx="5.6" cy="12" r="0.8" />
      </g>
    </svg>
  );
}

/* Notched tail tucked behind the band; the right one is the same shape mirrored */
function RibbonTail({ className = "" }: { className?: string }) {
  return (
    <svg width="38" height="44" viewBox="0 0 38 44" className={`shrink-0 ${className}`} aria-hidden="true">
      <path d="M37 10H1l10 16-10 16h36z" fill="#fff" stroke="var(--brand)" strokeWidth="1" strokeLinejoin="round" />
      <path d="M29 34h8v8z" fill="var(--brand-soft)" stroke="var(--brand)" strokeWidth="1" strokeLinejoin="round" />
    </svg>
  );
}

/* Line-art banner with folded tails and a faint gold sunburst behind it */
function ChristmasRibbon({ children }: { children: ReactNode }) {
  return (
    <div className="relative mt-6 inline-flex items-start">
      <svg
        className="pointer-events-none absolute top-1/2 left-1/2 -z-10 h-[260%] w-[130%] -translate-x-1/2 -translate-y-1/2"
        viewBox="-100 -100 200 200"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {Array.from({ length: 14 }, (_, i) => {
          // Two side fans, so the rays frame the ribbon without crossing the crest or the text below
          const a = (i < 7 ? 0 : Math.PI) + ((i % 7) - 3) * (Math.PI / 14);
          const r1 = 62 + (i % 3) * 6;
          const r2 = 92 + (i % 2) * 6;
          return (
            <line
              key={i}
              x1={(Math.cos(a) * r1).toFixed(1)}
              y1={(Math.sin(a) * r1).toFixed(1)}
              x2={(Math.cos(a) * r2).toFixed(1)}
              y2={(Math.sin(a) * r2).toFixed(1)}
              stroke="#f2b632"
              strokeOpacity="0.55"
              strokeWidth="1.2"
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </svg>
      <RibbonTail className="-mr-2.25" />
      <p className="relative z-10 inline-flex h-8.5 items-center gap-2 border border-brand bg-white px-3 font-serif text-[13px] font-semibold whitespace-nowrap text-brand italic shadow-[0_6px_14px_-8px_rgb(150_10_30/0.45)] min-[400px]:px-4 min-[400px]:text-[15px] sm:text-[17px]">
        <Mushroom size={20} />
        {children}
      </p>
      <RibbonTail className="-ml-2.25 -scale-x-100" />
    </div>
  );
}

export default function WelcomePage() {
  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-linear-to-b from-white via-[#fbf8f1] to-[#f1e9d8]" data-season={SEASON ?? undefined}>
      {SEASON === "christmas" && <SnowScene />}
      {/* One continuous gradient with soft glows down the whole page: no section has its own background */}
      {/* The glows step aside during Christmas so the animated sky stays clean */}
      <div className={`pointer-events-none absolute inset-0 -z-10 ${SEASON === "christmas" ? "hidden" : ""}`} aria-hidden="true">
        <div className="absolute -top-40 -left-32 size-140 rounded-full bg-[#1e3a5f]/10 blur-3xl" />
        <div className="absolute top-[18%] -right-48 size-140 rounded-full bg-[#9b2226]/8 blur-3xl" />
        <div className="absolute top-[42%] -left-48 size-130 rounded-full bg-sky-200/25 blur-3xl" />
        <div className="absolute top-[62%] -right-40 size-130 rounded-full bg-amber-200/30 blur-3xl" />
        <div className="absolute bottom-0 left-[25%] size-120 rounded-full bg-rose-200/25 blur-3xl" />
      </div>

      <header className="mx-auto flex w-full max-w-275 items-center justify-between gap-4 px-4 py-5 sm:px-6">
        <div className="flex items-center gap-2.5">
          <Emblem size={34} />
          <span className="font-serif text-[20px] font-semibold text-ink">{site.className}</span>
        </div>
        <Link
          href="/login"
          className="inline-flex h-10 items-center rounded-full border border-black/10 bg-white/70 px-4 text-[14px] font-medium text-ink backdrop-blur transition-colors hover:bg-white"
        >
          Sign in
        </Link>
      </header>

      <main id="main" className="flex-1">
        {/* Hero */}
        <section className="relative mx-auto flex max-w-215 flex-col items-center px-4 pt-10 pb-16 text-center sm:px-6 sm:pt-16">
          {SEASON === "christmas" && (
            <div className="pointer-events-none absolute inset-x-[-10%] inset-y-0 -z-10 bg-[radial-gradient(60%_55%_at_50%_45%,rgb(255_255_255/0.75),transparent_75%)]" aria-hidden="true" />
          )}
          <Emblem size={84} />
          {SEASON === "christmas" && <ChristmasRibbon>Merry Christmas from the {classLabel}</ChristmasRibbon>}
          <p className="mt-5 text-[12px] font-semibold uppercase tracking-[0.2em] text-muted">
            {site.schoolName} · {classLabel}
          </p>
          <h1 className="mt-3 font-serif text-[44px] leading-[1.05] font-semibold text-ink sm:text-[64px]">
            Twenty years later,
            <br />
            <span className="italic text-[#9b2226]">together again.</span>
          </h1>
          <p className="mt-5 max-w-140 text-[16px] leading-relaxed text-muted sm:text-[17px]">
            The private home of the {site.className} reunion: plans, decisions, RSVPs and contributions, all in one place
            for the class.
          </p>
          <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-4 py-1.5 text-[13px] font-medium text-ink backdrop-blur">
            <CalendarHeart size={15} className="text-[#9b2226]" aria-hidden="true" />
            Reunion {site.reunionYear} · {site.reunionPlace} · date to be announced
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex h-12 items-center gap-2 rounded-full bg-brand px-7 text-[15px] font-semibold text-on-dark shadow-[0_12px_28px_-12px_color-mix(in_oklab,var(--brand)_65%,transparent)] transition-colors hover:bg-brand-ink"
            >
              Sign in to the portal <ArrowRight size={17} aria-hidden="true" />
            </Link>
            <a href="#join" className="text-[14px] font-medium text-brand hover:underline">
              No account yet?
            </a>
          </div>
        </section>

        {/* Motto and mission: just type on the page, no band or card */}
        <section aria-labelledby="motto-heading">
          <div className="mx-auto max-w-190 px-4 py-16 text-center sm:px-6 sm:py-24">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">Our school motto</p>
            <h2 id="motto-heading" className="mt-3 font-serif text-[36px] leading-tight font-semibold text-[#9b2226] italic sm:text-[46px]">
              Ut Omnes Unum Sint
            </h2>
            <p className="mt-1 font-serif text-[20px] text-ink italic">That all may be one.</p>
            <div className="mx-auto my-7 h-px w-12 bg-[#9b2226]/40" aria-hidden="true" />
            <blockquote className="text-[16px] leading-relaxed text-muted sm:text-[17px]">
              &ldquo;The mission of {site.schoolName} is to educate students to become competent, conscientious, and
              compassionate leaders whose lives are guided by the Christian call of service.&rdquo;
            </blockquote>
          </div>
        </section>

        {/* Features: an editorial list, not a wall of cards */}
        <section aria-labelledby="inside-heading" className="mx-auto max-w-250 px-4 py-16 sm:px-6 sm:py-24">
          <h2 id="inside-heading" className="text-center font-serif text-[30px] font-semibold text-ink sm:text-[36px]">
            What&apos;s inside
          </h2>
          <ul className="mt-10 grid grid-cols-1 gap-x-12 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex gap-4 border-t border-black/10 py-5">
                <f.icon size={22} className="mt-0.5 shrink-0 text-[#9b2226]" aria-hidden="true" />
                <div>
                  <h3 className="text-[16px] font-semibold text-ink">{f.title}</h3>
                  <p className="mt-1 text-[14px] leading-relaxed text-muted">{f.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Open books preview */}
        <section aria-labelledby="books-heading" className="mx-auto max-w-275 px-4 py-16 sm:px-6 sm:py-24">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1fr_1.1fr]">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">Open books</p>
              <h2 id="books-heading" className="mt-3 font-serif text-[32px] leading-tight font-semibold text-ink sm:text-[40px]">
                Every dollar, in plain sight.
              </h2>
              <p className="mt-4 max-w-110 text-[15px] leading-relaxed text-muted">
                Treasurers record each contribution as it reaches the class account. Everyone can see the class goal, each
                classmate&apos;s target and how far along we are. Mistakes are corrected openly, never erased.
              </p>
              <p className="mt-3 max-w-110 text-[15px] leading-relaxed text-muted">
                Go above your target and you get a gold star. Bragging rights included.
              </p>
            </div>
            <ContributionsPreview />
          </div>
        </section>

        {/* The plan: the fun part. Same background as everything else. */}
        <section aria-labelledby="plan-heading" className="mx-auto max-w-190 px-4 py-16 text-center sm:px-6 sm:py-24">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">Classified</p>
          <h2 id="plan-heading" className="mt-3 font-serif text-[36px] leading-tight font-semibold text-ink sm:text-[46px]">
            The master plan
          </h2>
          <p className="mt-2 text-[14px] text-muted">Approved by the committee. Mostly.</p>
          <ol className="mx-auto mt-10 flex max-w-130 flex-col gap-5 text-left">
            {PLAN.map((step, i) => {
              const last = i === PLAN.length - 1;
              return (
                <li key={step} className="flex items-baseline gap-5">
                  <span className="figures w-6 shrink-0 text-right font-serif text-[24px] text-[#9b2226]/70">{i + 1}</span>
                  <span className={last ? "font-serif text-[26px] leading-tight italic text-[#9b2226]" : "text-[17px] text-ink"}>
                    {step}
                    {last && <span className="ml-2 align-middle font-sans text-[12px] text-muted not-italic">(kidding. mostly.)</span>}
                  </span>
                </li>
              );
            })}
          </ol>
        </section>

        {/* How to join */}
        <section id="join" aria-labelledby="join-heading" className="mx-auto max-w-215 scroll-mt-6 px-4 pt-8 pb-24 sm:px-6">
          <div className="rounded-[22px] border border-white/80 bg-white/80 p-6 shadow-[0_20px_50px_-24px_rgb(60_45_20/0.35)] ring-1 ring-black/5 sm:p-10">
            <div className="flex items-center gap-2.5">
              <KeyRound size={20} className="text-brand" aria-hidden="true" />
              <h2 id="join-heading" className="font-serif text-[28px] font-semibold text-ink">How to get in</h2>
            </div>
            <p className="mt-2 text-[14px] text-muted">Accounts are invite-only so the portal stays just for our class.</p>
            <ol className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
              {STEPS.map((s) => (
                <li key={s.n}>
                  <span className="grid size-9 place-items-center rounded-full bg-brand text-[14px] font-semibold text-on-dark" aria-hidden="true">
                    {s.n}
                  </span>
                  <h3 className="mt-3 text-[15px] font-semibold text-ink">{s.title}</h3>
                  <p className="mt-1 text-[14px] leading-relaxed text-muted">{s.text}</p>
                </li>
              ))}
            </ol>
            <div className="mt-8 border-t border-black/10 pt-6 text-center">
              <Link href="/login" className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-brand hover:underline">
                Already have an account? Sign in <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer className="border-black/10" />
    </div>
  );
}
