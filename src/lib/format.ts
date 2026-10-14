import { site } from "@/config/site";

const moneyWhole = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: site.currency,
  maximumFractionDigits: 0,
});

const moneyCents = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: site.currency,
  minimumFractionDigits: 2,
});

/** $2,480 for whole dollars, $12.50 otherwise. */
export function money(cents: number): string {
  return cents % 100 === 0 ? moneyWhole.format(cents / 100) : moneyCents.format(cents / 100);
}

export function percent(value: number): string {
  return `${Math.round(value)}%`;
}

const tz = { timeZone: site.timeZone } as const;

export function shortDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { ...tz, month: "short", day: "numeric", year: "numeric" }).format(new Date(iso));
}

export function monthDay(iso: string): { month: string; day: string } {
  const d = new Date(iso);
  return {
    month: new Intl.DateTimeFormat("en-US", { ...tz, month: "short" }).format(d).toUpperCase(),
    day: new Intl.DateTimeFormat("en-US", { ...tz, day: "numeric" }).format(d),
  };
}

export function timeRange(startIso: string, endIso?: string): string {
  const f = new Intl.DateTimeFormat("en-US", { ...tz, hour: "numeric", minute: "2-digit" });
  return endIso ? `${f.format(new Date(startIso))} to ${f.format(new Date(endIso))}` : f.format(new Date(startIso));
}

export function longDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { ...tz, weekday: "short", month: "short", day: "numeric", year: "numeric" }).format(new Date(iso));
}

const rtf = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });

export function relativeTime(iso: string, now: Date = new Date()): string {
  const seconds = Math.round((new Date(iso).getTime() - now.getTime()) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 60) return "just now";
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), "minute");
  if (abs < 86_400) return rtf.format(Math.round(seconds / 3600), "hour");
  if (abs < 86_400 * 7) return rtf.format(Math.round(seconds / 86_400), "day");
  if (abs < 86_400 * 30) return rtf.format(Math.round(seconds / (86_400 * 7)), "week");
  return shortDate(iso);
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}
