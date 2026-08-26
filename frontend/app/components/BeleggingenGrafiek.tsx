"use client";

import { useEffect, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TooltipContentProps } from "recharts";

import { ApiError, getPortfolio, type Positie } from "@/lib/api";
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

const PERIODE_OPTIES: { key: string; label: string; maanden: number | null }[] = [
  { key: "1m", label: "1M", maanden: 1 },
  { key: "3m", label: "3M", maanden: 3 },
  { key: "6m", label: "6M", maanden: 6 },
  { key: "1j", label: "1J", maanden: 12 },
  { key: "alles", label: "Alles", maanden: null },
];

function vanafVoorPeriode(maanden: number | null): string | null {
  if (maanden === null) return null;
  const d = new Date();
  d.setMonth(d.getMonth() - maanden);
  return d.toISOString().slice(0, 10);
}

interface BeleggingenGrafiekProps {
  portefeuilleId: number;
  posities: Positie[];
}

export function BeleggingenGrafiek({ portefeuilleId, posities }: BeleggingenGrafiekProps) {
  const [code, setCode] = useState<string | null>(null);
  const [periode, setPeriode] = useState("3m");
  const [data, setData] = useState<{ datum: string; waarde: number }[]>([]);
  const [laden, setLaden] = useState(true);
  const [foutmelding, setFoutmelding] = useState<string | null>(null);

  useEffect(() => {
    const maanden = PERIODE_OPTIES.find((p) => p.key === periode)?.maanden ?? null;
    getPortfolio(portefeuilleId, code, vanafVoorPeriode(maanden), null)
      .then((res) => setData(res.reeks.map((p) => ({ datum: p.datum, waarde: p.waarde }))))
      .catch((err) => setFoutmelding(err instanceof ApiError ? err.message : "Kon grafiek niet laden."))
      .finally(() => setLaden(false));
  }, [portefeuilleId, code, periode]);

  function kiesCode(nieuweCode: string | null) {
    setLaden(true);
    setCode(nieuweCode);
  }

  function kiesPeriode(nieuwePeriode: string) {
    setLaden(true);
    setPeriode(nieuwePeriode);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400">
        <button
          type="button"
          onClick={() => kiesCode(null)}
          className={
            "rounded-full border px-2.5 py-1 text-xs " +
            (code === null
              ? "border-neutral-900 text-neutral-900 dark:border-neutral-100 dark:text-neutral-100"
              : "border-neutral-300 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800")
          }
        >
          Totale portfolio
        </button>
        {posities.map((p) => (
          <button
            key={p.code}
            type="button"
            onClick={() => kiesCode(p.code)}
            className={
              "rounded-full border px-2.5 py-1 text-xs " +
              (code === p.code
                ? "border-neutral-900 text-neutral-900 dark:border-neutral-100 dark:text-neutral-100"
                : "border-neutral-300 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800")
            }
          >
            {p.naam}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400">
        {PERIODE_OPTIES.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => kiesPeriode(p.key)}
            className={
              "rounded-full border px-2.5 py-1 text-xs " +
              (periode === p.key
                ? "border-neutral-900 text-neutral-900 dark:border-neutral-100 dark:text-neutral-100"
                : "border-neutral-300 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800")
            }
          >
            {p.label}
          </button>
        ))}
      </div>

      {foutmelding && <p className="text-sm text-red-700 dark:text-red-400">{foutmelding}</p>}

      <div className={laden ? "opacity-50 transition-opacity" : "transition-opacity"}>
        {!laden && data.length === 0 ? (
          <p className="py-10 text-center text-sm text-neutral-400">Nog geen koersdata beschikbaar.</p>
        ) : (
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
              <Line
                dataKey="waarde"
                stroke="var(--chart-series-1)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
