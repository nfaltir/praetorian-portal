import Link from "next/link";
import { ArrowRight, CircleCheck, Clock, Undo2, type LucideIcon } from "lucide-react";

export function Panel({
  children,
  className = "",
  as: Tag = "section",
  labelledBy,
}: {
  children: React.ReactNode;
  className?: string;
  as?: "section" | "div" | "article";
  labelledBy?: string;
}) {
  return (
    <Tag aria-labelledby={labelledBy} className={`rounded-panel border border-line bg-panel ${className}`}>
      {children}
    </Tag>
  );
}

export function PanelHeader({ id, title, href, linkLabel = "View all" }: { id: string; title: string; href?: string; linkLabel?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <h2 id={id} className="font-serif text-[22px] leading-tight font-semibold">{title}</h2>
      {href && (
        <Link href={href} className="inline-flex shrink-0 items-center gap-1 text-[13px] font-medium text-brand hover:underline">
          {linkLabel} <ArrowRight size={14} aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

type Tone = "success" | "warning" | "danger" | "neutral";

const toneClass: Record<Tone, string> = {
  success: "bg-success-tint text-success",
  warning: "bg-warning-tint text-warning",
  danger: "bg-danger-tint text-danger",
  neutral: "bg-line text-muted",
};

/* Status is never color alone: always an icon plus a word. */
export function Badge({ tone, icon: Icon, children }: { tone: Tone; icon?: LucideIcon; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-medium ${toneClass[tone]}`}>
      {Icon && <Icon size={12} strokeWidth={2.25} aria-hidden="true" />}
      {children}
    </span>
  );
}

export const StatusIcons = { recorded: CircleCheck, reversed: Undo2, tentative: Clock };

export function ProgressBar({ value, label }: { value: number; label: string }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      className="h-1.5 w-full overflow-hidden rounded-full bg-line"
    >
      <div className="h-full rounded-full bg-brand" style={{ width: `${clamped}%` }} />
    </div>
  );
}
