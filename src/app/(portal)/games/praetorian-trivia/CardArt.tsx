import type { CSSProperties, ReactNode } from "react";
import { Spade, Star } from "lucide-react";
import { Emblem } from "@/components/shell/Emblem";

/*
  Praetorian Trivia card art.
  - Back: gold diamond lattice over the brand gradient, a double frame with
    spade corners, and an oval medallion with the school crest.
  - Front: ivory card stock with a fine paper grain, an inner frame and
    playing-card corner marks (spade and ? for trivia, star and ! for actions).
  The lattice and grain are tiny inline SVG images used as backgrounds, not
  live filters, so they cost nothing per frame and don't trip Safari's 3D
  flip (live filters inside a flipping card can show through on Safari).
  Colours come from the theme tokens, so the deck follows the season.
  The back uses bg-[var(--brand-ink)], not the bg-brand-ink class: the
  Christmas theme turns .bg-brand-ink white for the sidebar.
*/

const svg = (s: string) => `url("data:image/svg+xml,${encodeURIComponent(s)}")`;

const LATTICE = svg(
  "<svg xmlns='http://www.w3.org/2000/svg' width='26' height='26'>" +
    "<path d='M13 0 L26 13 L13 26 L0 13 Z' fill='none' stroke='rgba(255,226,160,0.34)' stroke-width='1'/>" +
    "<circle cx='13' cy='13' r='1.7' fill='rgba(255,226,160,0.55)'/>" +
    "<g fill='rgba(255,226,160,0.32)'><circle cx='0' cy='0' r='1.2'/><circle cx='26' cy='0' r='1.2'/>" +
    "<circle cx='0' cy='26' r='1.2'/><circle cx='26' cy='26' r='1.2'/></g></svg>",
);

const GRAIN = svg(
  "<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'>" +
    "<filter id='g'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/>" +
    "<feColorMatrix values='0 0 0 0 0.45  0 0 0 0 0.34  0 0 0 0 0.2  0 0 0 0.1 0'/></filter>" +
    "<rect width='100%' height='100%' filter='url(#g)'/></svg>",
);

const CORNERS = ["top-3 left-3", "top-3 right-3", "bottom-3 left-3 rotate-180", "bottom-3 right-3 rotate-180"];

export function CardBack({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return (
    <div
      className={`rounded-[22px] bg-[var(--brand-ink)] p-2 shadow-[0_18px_40px_-18px_rgb(0_0_0/0.5)] ${className}`}
      style={style}
      aria-hidden="true"
    >
      <div
        className="relative size-full overflow-hidden rounded-[16px]"
        style={{ backgroundImage: `${LATTICE}, linear-gradient(150deg, var(--brand), var(--brand-ink))` }}
      >
        <div className="absolute inset-2 rounded-[11px] border border-accent/75" />
        <div className="absolute inset-[13px] rounded-[8px] border border-accent/35" />
        {CORNERS.map((pos) => (
          <Spade key={pos} size={12} className={`absolute fill-accent text-accent ${pos}`} />
        ))}
        <div className="absolute inset-0 grid place-items-center">
          <div className="flex w-[66%] flex-col items-center gap-1.5 rounded-[50%/40%] border-2 border-accent/85 bg-brand-ink/90 px-4 py-7 text-center shadow-[0_0_0_5px_var(--brand),0_0_0_6px_rgb(255_226_160/0.5)]">
            <Emblem size={46} />
            <p className="mt-1 font-serif text-[21px] leading-tight font-semibold text-on-dark">Praetorian Trivia</p>
            <p className="text-[10px] font-medium tracking-[0.28em] text-accent uppercase">Class of 2010</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CornerMark({ kind, className }: { kind: "question" | "action"; className: string }) {
  const Icon = kind === "question" ? Spade : Star;
  return (
    <div className={`absolute flex flex-col items-center leading-none text-brand ${className}`} aria-hidden="true">
      <span className="font-serif text-[22px] font-bold">{kind === "question" ? "?" : "!"}</span>
      <Icon size={13} className="mt-0.5 fill-brand" />
    </div>
  );
}

export function CardFront({
  kind,
  className = "",
  children,
}: {
  kind: "question" | "action";
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`overflow-hidden rounded-[22px] border border-[#e6d8c0] shadow-[0_18px_40px_-18px_rgb(60_30_10/0.4)] ${className}`}
      style={{ backgroundImage: `${GRAIN}, linear-gradient(160deg, #fffdf6, #fbf2e2)` }}
    >
      <div className="pointer-events-none absolute inset-2.5 rounded-[15px] border border-brand/20" aria-hidden="true" />
      <Spade
        size={190}
        strokeWidth={1}
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-brand/[0.06]"
        aria-hidden="true"
      />
      <CornerMark kind={kind} className="top-4 left-4" />
      <CornerMark kind={kind} className="right-4 bottom-4 rotate-180" />
      <div className="relative flex size-full flex-col overflow-y-auto px-8 pt-12 pb-12">{children}</div>
    </div>
  );
}
