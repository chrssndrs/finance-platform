"use client";

import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TooltipContentProps } from "recharts";

import type { Granulariteit, PeriodeTotaal } from "@/lib/api";
import { EENHEID_ENKELVOUD, formatteerPeriode } from "@/lib/periode";

const bedragFormat = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });
const compactBedragFormat = new Intl.NumberFormat("nl-NL", {
  style: "currency",
  currency: "EUR",
  notation: "compact",
});

const STANDAARD_TREND_VENSTER = 3;

function berekenVoortschrijdendGemiddelde(reeks: PeriodeTotaal[], trendVenster: number): number[] {
  return reeks.map((_, i) => {
    const start = Math.max(0, i - trendVenster + 1);
    const venster = reeks.slice(start, i + 1);
    const som = venster.reduce((acc, r) => acc + r.totaal, 0);
    return som / venster.length;
  });
}

function maakSerieLabels(granulariteit: Granulariteit, trendVenster: number): Record<string, string> {
  return {
    inkomsten: "Inkomsten",
    uitgaven: "Uitgaven",
    verwachte_inkomsten: "Verwachte inkomsten",
    verwachte_uitgaven: "Verwachte uitgaven",
    gemiddelde: `Gemiddelde (${trendVenster} ${EENHEID_ENKELVOUD[granulariteit]})`,
  };
}

function maakCustomTooltip(serieLabels: Record<string, string>) {
  return function CustomTooltip({ active, payload, label }: TooltipContentProps) {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
        <div className="mb-1 text-neutral-500 dark:text-neutral-400">{label}</div>
        {payload.map((item) => (
          <div key={item.dataKey as string} className="flex items-center gap-2">
            <span className="inline-block h-0.5 w-3" style={{ backgroundColor: item.color }} />
            <span className="font-semibold text-neutral-900 dark:text-neutral-100">
              {bedragFormat.format(item.value as number)}
            </span>
            <span className="text-neutral-500 dark:text-neutral-400">{serieLabels[item.dataKey as string]}</span>
          </div>
        ))}
      </div>
    );
  };
}

export type SerieKey = "inkomsten" | "uitgaven" | "verwachte_inkomsten" | "verwachte_uitgaven";

const ALLE_SERIES_ZICHTBAAR: Record<SerieKey, boolean> = {
  inkomsten: true,
  uitgaven: true,
  verwachte_inkomsten: true,
  verwachte_uitgaven: true,
};

interface TotalenChartProps {
  reeks: PeriodeTotaal[];
  granulariteit: Granulariteit;
  geselecteerdePeriode?: string | null;
  onPeriodeKlik?: (periodeStart: string) => void;
  /** Toont de 2 extra "verwacht"-lagen (planning-module) — staat uit voor
   * de kleine homepage-widgets die dit component ook gebruiken. */
  toonVerwacht?: boolean;
  zichtbareSeries?: Record<SerieKey, boolean>;
  /** Aantal perioden voor het voortschrijdend gemiddelde (trendlijn),
   * instelbaar via Instellingen — default 3 voor callers die 'm niet
   * doorgeven (bv. homepage-widgets). */
  trendVenster?: number;
}

export function TotalenChart({
  reeks,
  granulariteit,
  geselecteerdePeriode,
  onPeriodeKlik,
  toonVerwacht = false,
  zichtbareSeries = ALLE_SERIES_ZICHTBAAR,
  trendVenster = STANDAARD_TREND_VENSTER,
}: TotalenChartProps) {
  const gemiddelden = berekenVoortschrijdendGemiddelde(reeks, trendVenster);
  const data = reeks.map((r, i) => ({
    periode: formatteerPeriode(r.periode_start, granulariteit),
    periodeStart: r.periode_start,
    inkomsten: r.inkomsten,
    uitgaven: r.uitgaven,
    verwachte_inkomsten: r.verwachte_inkomsten,
    verwachte_uitgaven: r.verwachte_uitgaven,
    gemiddelde: gemiddelden[i],
  }));
  const serieLabels = maakSerieLabels(granulariteit, trendVenster);
  const CustomTooltip = maakCustomTooltip(serieLabels);

  function klikBalk(item: { payload?: { periodeStart: string } }) {
    if (item.payload) onPeriodeKlik?.(item.payload.periodeStart);
  }

  function celOpacity(periodeStart: string): number {
    if (!geselecteerdePeriode) return 1;
    return periodeStart === geselecteerdePeriode ? 1 : 0.4;
  }

  const toonVerwachteInkomsten = toonVerwacht && zichtbareSeries.verwachte_inkomsten;
  const toonVerwachteUitgaven = toonVerwacht && zichtbareSeries.verwachte_uitgaven;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
        <CartesianGrid vertical={false} stroke="var(--chart-gridline)" strokeDasharray="0" />
        <XAxis
          dataKey="periode"
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
            <span className="text-neutral-600 dark:text-neutral-400">{serieLabels[value] ?? value}</span>
          )}
        />
        {/*
          Alle 4 balken staan hier altijd, in een vaste volgorde — zichtbaarheid
          wordt geregeld met Recharts' eigen "hide"-prop i.p.v. conditionele
          JSX-mounting ({cond && <Bar/>}). Conditioneel mounten/unmounten zonder
          stabiele identiteit liet een net-heraangemaakte balk soms bovenaan de
          stack belanden i.p.v. op zijn vaste plek (bv. na inkomsten uit- en weer
          aanvinken) — met "hide" blijven alle Bar-elementen de hele tijd
          gemount, dus verandert de interne render-volgorde nooit.
        */}
        <Bar
          key="inkomsten"
          dataKey="inkomsten"
          stackId="periode"
          fill="var(--chart-series-1)"
          maxBarSize={24}
          hide={!zichtbareSeries.inkomsten}
          legendType={zichtbareSeries.inkomsten ? "square" : "none"}
          isAnimationActive={false}
          onClick={onPeriodeKlik ? klikBalk : undefined}
          style={onPeriodeKlik ? { cursor: "pointer" } : undefined}
        >
          {onPeriodeKlik &&
            data.map((d) => <Cell key={d.periodeStart} fillOpacity={celOpacity(d.periodeStart)} />)}
        </Bar>
        <Bar
          key="verwachte_inkomsten"
          dataKey="verwachte_inkomsten"
          stackId="periode"
          fill="var(--chart-series-1)"
          fillOpacity={0.4}
          maxBarSize={24}
          hide={!toonVerwachteInkomsten}
          legendType={toonVerwachteInkomsten ? "square" : "none"}
          isAnimationActive={false}
          onClick={onPeriodeKlik ? klikBalk : undefined}
          style={onPeriodeKlik ? { cursor: "pointer" } : undefined}
        />
        <Bar
          key="uitgaven"
          dataKey="uitgaven"
          stackId="periode"
          fill="var(--chart-series-2)"
          radius={toonVerwachteUitgaven ? undefined : [4, 4, 0, 0]}
          maxBarSize={24}
          hide={!zichtbareSeries.uitgaven}
          legendType={zichtbareSeries.uitgaven ? "square" : "none"}
          isAnimationActive={false}
          onClick={onPeriodeKlik ? klikBalk : undefined}
          style={onPeriodeKlik ? { cursor: "pointer" } : undefined}
        >
          {onPeriodeKlik &&
            data.map((d) => <Cell key={d.periodeStart} fillOpacity={celOpacity(d.periodeStart)} />)}
        </Bar>
        <Bar
          key="verwachte_uitgaven"
          dataKey="verwachte_uitgaven"
          stackId="periode"
          fill="var(--chart-series-2)"
          fillOpacity={0.4}
          radius={[4, 4, 0, 0]}
          maxBarSize={24}
          hide={!toonVerwachteUitgaven}
          legendType={toonVerwachteUitgaven ? "square" : "none"}
          isAnimationActive={false}
          onClick={onPeriodeKlik ? klikBalk : undefined}
          style={onPeriodeKlik ? { cursor: "pointer" } : undefined}
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
