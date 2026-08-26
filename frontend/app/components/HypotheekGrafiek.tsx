"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TooltipContentProps } from "recharts";

import type { SchuldPunt } from "@/lib/api";
import { formatteerDatumKort } from "@/lib/periode";

const bedragFormat = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });
const compactBedragFormat = new Intl.NumberFormat("nl-NL", {
  style: "currency",
  currency: "EUR",
  notation: "compact",
});

function vandaagIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function CustomTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  const punt = payload[0].payload as { datum: string; schuld: number };
  return (
    <div className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
      <div className="mb-1 text-neutral-500 dark:text-neutral-400">{formatteerDatumKort(punt.datum)}</div>
      <div className="font-semibold text-neutral-900 dark:text-neutral-100">{bedragFormat.format(punt.schuld)}</div>
    </div>
  );
}

export function HypotheekGrafiek({ reeks }: { reeks: SchuldPunt[] }) {
  const data = reeks.map((p) => ({ datum: p.datum, schuld: p.schuld }));
  const vandaag = vandaagIso();
  const toontVandaag = data.length > 0 && vandaag >= data[0].datum && vandaag <= data[data.length - 1].datum;

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
          tickFormatter={(v: number) => compactBedragFormat.format(v)}
        />
        <Tooltip content={CustomTooltip} />
        {toontVandaag && (
          <ReferenceArea
            x1={data[0].datum}
            x2={vandaag}
            fill="var(--chart-gridline)"
            fillOpacity={0.5}
            ifOverflow="hidden"
          />
        )}
        <Line
          dataKey="schuld"
          stroke="var(--chart-series-1)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
          isAnimationActive={false}
        />
        {toontVandaag && (
          <ReferenceLine
            x={vandaag}
            stroke="var(--chart-text-secondary)"
            strokeWidth={1.5}
            label={{ value: "Vandaag", position: "insideTopRight", fill: "var(--chart-text-secondary)", fontSize: 11 }}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
