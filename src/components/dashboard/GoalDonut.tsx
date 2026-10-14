"use client";

import { Cell, Pie, PieChart, Tooltip } from "recharts";

type Slice = { name: string; value: number; color: string; label: string };

/* Decorative-plus-hover chart. The same numbers are always printed beside it. */
export function GoalDonut({
  collectedCents,
  remainingCents,
  collectedLabel,
  remainingLabel,
  size = 184,
}: {
  collectedCents: number;
  remainingCents: number;
  collectedLabel: string;
  remainingLabel: string;
  size?: number;
}) {
  const data: Slice[] = [
    { name: "Collected", value: collectedCents, color: "var(--brand)", label: collectedLabel },
    { name: "Remaining", value: remainingCents, color: "var(--brand-soft)", label: remainingLabel },
  ].filter((d) => d.value > 0);

  if (data.length === 0) {
    data.push({ name: "No goal set", value: 1, color: "var(--line)", label: "" });
  }

  return (
    <PieChart width={size} height={size} accessibilityLayer={false}>
      <Pie
        data={data}
        dataKey="value"
        nameKey="name"
        innerRadius={size * 0.38}
        outerRadius={size * 0.48}
        startAngle={90}
        endAngle={-270}
        stroke="var(--panel)"
        strokeWidth={2}
        isAnimationActive={false}
      >
        {data.map((d) => (
          <Cell key={d.name} fill={d.color} />
        ))}
      </Pie>
      <Tooltip
        cursor={false}
        content={({ active, payload }) => {
          if (!active || !payload?.length) return null;
          const p = payload[0]!.payload as Slice;
          if (!p.label) return null;
          return (
            <div className="rounded-control border border-line bg-panel px-3 py-2 text-[13px] shadow-md">
              <span className="text-muted">{p.name}</span>{" "}
              <span className="figures font-semibold text-ink">{p.label}</span>
            </div>
          );
        }}
      />
    </PieChart>
  );
}
