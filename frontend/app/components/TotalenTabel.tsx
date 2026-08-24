"use client";

import { useMemo, useState } from "react";

import type { SerieKey } from "@/app/components/TotalenChart";
import type { Granulariteit, PeriodeTotaal } from "@/lib/api";
import { formatteerPeriode } from "@/lib/periode";

const bedragFormat = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });

type SortKey = keyof PeriodeTotaal;

const ALLE_SERIES_ZICHTBAAR: Record<SerieKey, boolean> = {
  inkomsten: true,
  uitgaven: true,
  verwachte_inkomsten: true,
  verwachte_uitgaven: true,
};

const KOLOMMEN: { key: SortKey; label: string; serie?: SerieKey }[] = [
  { key: "periode_start", label: "Periode" },
  { key: "inkomsten", label: "Inkomsten", serie: "inkomsten" },
  { key: "uitgaven", label: "Uitgaven", serie: "uitgaven" },
  { key: "verwachte_inkomsten", label: "Verwachte inkomsten", serie: "verwachte_inkomsten" },
  { key: "verwachte_uitgaven", label: "Verwachte uitgaven", serie: "verwachte_uitgaven" },
  { key: "totaal", label: "Totaal" },
];

interface TotalenTabelProps {
  reeks: PeriodeTotaal[];
  granulariteit: Granulariteit;
  geselecteerdePeriode?: string | null;
  onPeriodeKlik?: (periodeStart: string) => void;
  zichtbareSeries?: Record<SerieKey, boolean>;
}

export function TotalenTabel({
  reeks,
  granulariteit,
  geselecteerdePeriode,
  onPeriodeKlik,
  zichtbareSeries = ALLE_SERIES_ZICHTBAAR,
}: TotalenTabelProps) {
  const kolommen = KOLOMMEN.filter((k) => !k.serie || zichtbareSeries[k.serie]);
  const [sortKey, setSortKey] = useState<SortKey>("periode_start");
  const [aflopend, setAflopend] = useState(true);

  const gesorteerd = useMemo(() => {
    const kopie = [...reeks];
    kopie.sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      const vergelijking = typeof va === "string" ? va.localeCompare(vb as string) : (va as number) - (vb as number);
      return aflopend ? -vergelijking : vergelijking;
    });
    return kopie;
  }, [reeks, sortKey, aflopend]);

  function klikKolom(key: SortKey) {
    if (key === sortKey) {
      setAflopend((v) => !v);
    } else {
      setSortKey(key);
      setAflopend(true);
    }
  }

  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-neutral-300 dark:border-neutral-700">
          {kolommen.map((k) => (
            <th key={k.key} className="py-2 font-medium text-neutral-600 dark:text-neutral-400">
              <button
                type="button"
                onClick={() => klikKolom(k.key)}
                className="flex items-center gap-1 hover:text-neutral-900 dark:hover:text-neutral-100"
              >
                {k.label}
                {sortKey === k.key && <span className="text-xs">{aflopend ? "▼" : "▲"}</span>}
              </button>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {gesorteerd.map((r) => (
          <tr
            key={r.periode_start}
            onClick={() => onPeriodeKlik?.(r.periode_start)}
            className={
              "border-b border-neutral-200 dark:border-neutral-800" +
              (onPeriodeKlik ? " cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-900" : "") +
              (geselecteerdePeriode === r.periode_start ? " bg-neutral-100 dark:bg-neutral-800" : "")
            }
          >
            <td className="py-2">{formatteerPeriode(r.periode_start, granulariteit)}</td>
            {zichtbareSeries.inkomsten && <td className="py-2 tabular-nums">{bedragFormat.format(r.inkomsten)}</td>}
            {zichtbareSeries.uitgaven && <td className="py-2 tabular-nums">{bedragFormat.format(r.uitgaven)}</td>}
            {zichtbareSeries.verwachte_inkomsten && (
              <td className="py-2 tabular-nums">{bedragFormat.format(r.verwachte_inkomsten)}</td>
            )}
            {zichtbareSeries.verwachte_uitgaven && (
              <td className="py-2 tabular-nums">{bedragFormat.format(r.verwachte_uitgaven)}</td>
            )}
            <td className="py-2 tabular-nums">{bedragFormat.format(r.totaal)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
