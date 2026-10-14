import { site } from "@/config/site";

/* Typographic shield. No real crest required. */
export function Emblem({ size = 44 }: { size?: number }) {
  const letters = site.monogram.slice(0, 3);
  const fontSize = letters.length === 1 ? 20 : letters.length === 2 ? 15 : 11;
  return (
    <svg width={size} height={size * 1.15} viewBox="0 0 40 46" aria-hidden="true" className="shrink-0">
      <path
        d="M20 2 L37 7 V22 C37 33 29.5 40.5 20 44 C10.5 40.5 3 33 3 22 V7 Z"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="1.4"
      />
      <path
        d="M20 5.5 L33.8 9.6 V22 C33.8 31 27.6 37.3 20 40.4 C12.4 37.3 6.2 31 6.2 22 V9.6 Z"
        fill="none"
        stroke="var(--accent)"
        strokeOpacity="0.45"
        strokeWidth="0.8"
      />
      <text
        x="20"
        y="25.5"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="var(--accent)"
        fontFamily="var(--font-serif)"
        fontWeight="600"
        fontSize={fontSize}
        letterSpacing="0.5"
      >
        {letters}
      </text>
    </svg>
  );
}
