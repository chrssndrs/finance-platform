"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
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
  gemiddelde: "Gemiddelde (3 mnd)",
};

const TREND_VENSTER = 3;

function berekenVoortschrijdendGemiddelde(reeks: MaandTotaal[]): number[] {
  return reeks.map((_, i) => {
    const start = Math.max(0, i - TREND_VENSTER + 1);
    const venster = reeks.slice(start, i + 1);
    const som = venster.reduce((acc, r) => acc + r.totaal, 0);
    return som / venster.length;
  });
}

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
  const gemiddelden = berekenVoortschrijdendGemiddelde(reeks);
  const data = reeks.map((r, i) => ({
    maand: r.maand,
    inkomsten: r.inkomsten,
    uitgaven: r.uitgaven,
    gemiddelde: gemiddelden[i],
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
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
        <Bar
          dataKey="inkomsten"
          stackId="maand"
          fill="var(--chart-series-1)"
          maxBarSize={24}
          isAnimationActive={false}
        />
        <Bar
          dataKey="uitgaven"
          stackId="maand"
          fill="var(--chart-series-2)"
          radius={[4, 4, 0, 0]}
          maxBarSize={24}
          isAnimationActive={false}
        />
        <Line
          dataKey="gemiddelde"
          stroke="var(--chart-series-3)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
