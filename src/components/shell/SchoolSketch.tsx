/* Quiet line drawing of a generic school building for the sidebar footer. */
export function SchoolSketch() {
  return (
    <svg viewBox="0 0 220 90" className="w-full" aria-hidden="true" fill="none" stroke="var(--on-dark)" strokeOpacity="0.22" strokeWidth="1">
      {/* ground */}
      <path d="M0 88 H220" />
      {/* left wing */}
      <path d="M18 88 V54 H78 V88" />
      <path d="M14 54 L48 40 L82 54" />
      {[26, 40, 54, 66].map((x) => (
        <rect key={`lw${x}`} x={x} y="62" width="7" height="11" />
      ))}
      {/* tower */}
      <path d="M88 88 V30 H124 V88" />
      <path d="M84 30 L106 6 L128 30" />
      <path d="M106 6 V1" />
      <circle cx="106" cy="42" r="6" />
      <path d="M98 88 V66 Q106 58 114 66 V88" />
      {/* right wing */}
      <path d="M134 88 V50 H200 V88" />
      <path d="M130 50 L167 34 L204 50" />
      {[142, 156, 170, 184].map((x) => (
        <rect key={`rw${x}`} x={x} y="58" width="7" height="11" />
      ))}
      {/* trees */}
      <path d="M6 88 V76 M2 78 Q6 62 10 78" />
      <path d="M212 88 V74 M207 77 Q212 58 217 77" />
    </svg>
  );
}
