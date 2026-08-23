"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TooltipContentProps } from "recharts";

import type { Waarde } from "@/lib/api";
import { formatteerDatumKort } from "@/lib/periode";

const bedragFormat = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });
const compactBedragFormat = new Intl.NumberFormat("nl-NL", {
  style: "currency",
  currency: "EUR",
  notation: "compact",
});

function CustomTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  const punt = payload[0].payload as { datum: string; waarde: number };
  return (
    <div className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
      <div className="mb-1 text-neutral-500 dark:text-neutral-400">{formatteerDatumKort(punt.datum)}</div>
      <div className="font-semibold text-neutral-900 dark:text-neutral-100">{bedragFormat.format(punt.waarde)}</div>
    </div>
  );
}

export function VastgoedGrafiek({ waardes }: { waardes: Waarde[] }) {
  const data = waardes.map((w) => ({ datum: w.datum, waarde: w.waarde }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
        <CartesianGrid vertical={false} stroke="var(--chart-gridline)" strokeDasharray="0" />
        <XAxis
          dataKey="datum"
          tickFormatter={(v: string) => formatteerDatumKort(v)}
          tick={{ fill: "var(--chart-text-muted)", fontSize: 12 }}
          axisLine={{ stroke: "var(--chart-baseline)" }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "var(--chart-text-muted)", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          domain={["dataMin", "dataMax"]}
          tickFormatter={(v: number) => compactBedragFormat.format(v)}
        />
        <Tooltip content={CustomTooltip} />
        <Line
          dataKey="waarde"
          stroke="var(--chart-series-1)"
          strokeWidth={2}
          dot={{ r: 3, fill: "var(--chart-series-1)" }}
          activeDot={{ r: 5 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
