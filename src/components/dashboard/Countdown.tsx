"use client";

import { useSyncExternalStore } from "react";

/* Ticks once a minute. Server render returns null so there is no hydration mismatch. */
const subscribe = (cb: () => void) => {
  const id = setInterval(cb, 60_000);
  return () => clearInterval(id);
};
const minuteNow = () => Math.floor(Date.now() / 60_000);

function breakdown(fromMs: number, to: Date) {
  const from = new Date(fromMs);
  if (from >= to) return null;
  const cursor = new Date(from);
  let years = 0;
  let months = 0;
  const step = (fn: (d: Date) => void) => {
    const next = new Date(cursor);
    fn(next);
    return next;
  };
  while (step((d) => d.setFullYear(d.getFullYear() + 1)) <= to) {
    cursor.setFullYear(cursor.getFullYear() + 1);
    years++;
  }
  while (step((d) => d.setMonth(d.getMonth() + 1)) <= to) {
    cursor.setMonth(cursor.getMonth() + 1);
    months++;
  }
  const rest = to.getTime() - cursor.getTime();
  return {
    years,
    months,
    days: Math.floor(rest / 86_400_000),
    hours: Math.floor((rest % 86_400_000) / 3_600_000),
  };
}

export function Countdown({ targetIso }: { targetIso: string }) {
  const minute = useSyncExternalStore(subscribe, minuteNow, () => null);
  const target = new Date(targetIso);
  const parts = minute === null ? null : breakdown(minute * 60_000, target);

  if (minute !== null && parts === null) {
    return <p className="font-serif text-[22px] text-on-dark">It is reunion time.</p>;
  }

  const cells: [string, number | undefined][] = [
    ["Years", parts?.years],
    ["Months", parts?.months],
    ["Days", parts?.days],
    ["Hrs", parts?.hours],
  ];

  return (
    <dl className="grid grid-cols-4 gap-4" aria-live="off">
      {cells.map(([label, value]) => (
        <div key={label} className="flex flex-col gap-1.5">
          <dt className="order-2 text-[12px] text-on-dark-muted">{label}</dt>
          <dd className="figures font-serif text-[34px] leading-none text-on-dark">
            {value ?? <span className="opacity-40">--</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}
