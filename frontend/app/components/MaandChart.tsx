"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TooltipContentProps } from "recharts";

import type { MaandTotaal } from "@/lib/api";

const bedragFormat = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });
const compactBedragFormat = new Intl.NumberFormat("nl-NL", {
  style: "currency",
  currency: "EUR",
  notation: "compact",
});

const SERIE_LABELS: Record<string, string> = {
  inkomsten: "Inkomsten",
  uitgaven: "Uitgaven",
};

function CustomTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
      <div className="mb-1 text-neutral-500 dark:text-neutral-400">{label}</div>
      {payload.map((item) => (
        <div key={item.dataKey as string} className="flex items-center gap-2">
          <span
            className="inline-block h-0.5 w-3"
            style={{ backgroundColor: item.color }}
          />
          <span className="font-semibold text-neutral-900 dark:text-neutral-100">
            {bedragFormat.format(item.value as number)}
          </span>
          <span className="text-neutral-500 dark:text-neutral-400">
            {SERIE_LABELS[item.dataKey as string]}
          </span>
        </div>
      ))}
    </div>
  );
}

export function MaandChart({ reeks }: { reeks: MaandTotaal[] }) {
  const data = reeks.map((r) => ({
    maand: r.maand,
    inkomsten: r.inkomsten,
    uitgaven: r.uitgaven,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
        <CartesianGrid
          vertical={false}
          stroke="var(--chart-gridline)"
          strokeDasharray="0"
        />
        <XAxis
          dataKey="maand"
          tick={{ fill: "var(--chart-text-muted)", fontSize: 12 }}
          axisLine={{ stroke: "var(--chart-baseline)" }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "var(--chart-text-muted)", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => compactBedragFormat.format(v)}
        />
        <Tooltip content={CustomTooltip} cursor={{ fill: "var(--chart-gridline)" }} />
        <Legend
          formatter={(value: string) => (
            <span className="text-neutral-600 dark:text-neutral-400">
              {SERIE_LABELS[value] ?? value}
            </span>
          )}
        />
        <Bar dataKey="inkomsten" stackId="maand" fill="var(--chart-series-1)" maxBarSize={24} />
        <Bar
          dataKey="uitgaven"
          stackId="maand"
          fill="var(--chart-series-2)"
          radius={[4, 4, 0, 0]}
          maxBarSize={24}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
