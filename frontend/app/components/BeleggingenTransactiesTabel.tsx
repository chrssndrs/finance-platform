"use client";

import { useMemo, useState } from "react";

import type { BeleggingTransactie } from "@/lib/api";
import { formatteerDatumKort } from "@/lib/periode";

const aantalFormat = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 6 });

function formatteerValuta(bedrag: number, valuta: string): string {
  try {
    return new Intl.NumberFormat("nl-NL", { style: "currency", currency: valuta }).format(bedrag);
  } catch {
    return `${bedrag.toFixed(2)} ${valuta}`;
  }
}

type SortKey = "datum" | "code" | "type" | "aantal";

const KOLOMMEN: { key: SortKey; label: string }[] = [
  { key: "datum", label: "Datum" },
  { key: "type", label: "Type" },
  { key: "code", label: "Aandeel/tracker" },
  { key: "aantal", label: "Aantal" },
];

interface BeleggingenTransactiesTabelProps {
  transacties: BeleggingTransactie[];
  onRijKlik: (transactie: BeleggingTransactie) => void;
}

export function BeleggingenTransactiesTabel({ transacties, onRijKlik }: BeleggingenTransactiesTabelProps) {
  const [sortKey, setSortKey] = useState<SortKey>("datum");
  const [aflopend, setAflopend] = useState(true);

  const gesorteerd = useMemo(() => {
    const kopie = [...transacties];
    kopie.sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      const vergelijking = typeof va === "string" ? va.localeCompare(vb as string) : (va as number) - (vb as number);
      return aflopend ? -vergelijking : vergelijking;
    });
    return kopie;
  }, [transacties, sortKey, aflopend]);

  function klikKolom(key: SortKey) {
    if (key === sortKey) {
      setAflopend((v) => !v);
    } else {
      setSortKey(key);
      setAflopend(false);
    }
  }

  if (transacties.length === 0) {
    return <p className="py-6 text-center text-sm text-neutral-400">Nog geen transacties ingevoerd.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-neutral-300 dark:border-neutral-700">
            {KOLOMMEN.map((k) => (
              <th key={k.key} className="whitespace-nowrap py-2 pr-4 font-medium text-neutral-600 dark:text-neutral-400">
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
            <th className="py-2 font-medium text-neutral-600 dark:text-neutral-400">Prijs per stuk</th>
          </tr>
        </thead>
        <tbody>
          {gesorteerd.map((t) => (
            <tr
              key={t.id}
              onClick={() => onRijKlik(t)}
              className="cursor-pointer border-b border-neutral-200 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900/60"
            >
              <td className="py-2 pr-4 whitespace-nowrap tabular-nums">{formatteerDatumKort(t.datum)}</td>
              <td className="py-2 pr-4">
                <span
                  className={
                    "rounded-full px-2 py-0.5 text-xs font-medium " +
                    (t.type === "koop"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
                      : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300")
                  }
                >
                  {t.type === "koop" ? "Koop" : "Verkoop"}
                </span>
              </td>
              <td className="py-2 pr-4">
                <div className="text-neutral-900 dark:text-neutral-100">{t.naam ?? t.code}</div>
                <div className="text-xs text-neutral-400">{t.code}</div>
              </td>
              <td className="py-2 pr-4 tabular-nums">{aantalFormat.format(t.aantal)}</td>
              <td className="py-2 tabular-nums">{formatteerValuta(t.prijs_per_stuk, t.valuta)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
