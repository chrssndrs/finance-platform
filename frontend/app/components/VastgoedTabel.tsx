"use client";

import { useMemo, useState } from "react";

import type { Waarde } from "@/lib/api";
import { formatteerDatumKort } from "@/lib/periode";

const bedragFormat = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });

type SortKey = "datum" | "waarde" | "bron" | "opmerking";

const KOLOMMEN: { key: SortKey; label: string }[] = [
  { key: "datum", label: "Datum" },
  { key: "waarde", label: "Waarde" },
  { key: "bron", label: "Bron" },
  { key: "opmerking", label: "Opmerking" },
];

interface VastgoedTabelProps {
  waardes: Waarde[];
  onRijKlik: (waarde: Waarde) => void;
}

export function VastgoedTabel({ waardes, onRijKlik }: VastgoedTabelProps) {
  const [sortKey, setSortKey] = useState<SortKey>("datum");
  const [aflopend, setAflopend] = useState(true);

  const gesorteerd = useMemo(() => {
    const kopie = [...waardes];
    kopie.sort((a, b) => {
      const va = a[sortKey] ?? "";
      const vb = b[sortKey] ?? "";
      const vergelijking = typeof va === "string" ? va.localeCompare(vb as string) : (va as number) - (vb as number);
      return aflopend ? -vergelijking : vergelijking;
    });
    return kopie;
  }, [waardes, sortKey, aflopend]);

  function klikKolom(key: SortKey) {
    if (key === sortKey) {
      setAflopend((v) => !v);
    } else {
      setSortKey(key);
      setAflopend(false);
    }
  }

  if (waardes.length === 0) {
    return <p className="py-6 text-center text-sm text-neutral-400">Nog geen waardes ingevoerd.</p>;
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
          </tr>
        </thead>
        <tbody>
          {gesorteerd.map((w) => (
            <tr
              key={w.id}
              onClick={() => onRijKlik(w)}
              className="cursor-pointer border-b border-neutral-200 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900/60"
            >
              <td className="py-2 pr-4 whitespace-nowrap tabular-nums">{formatteerDatumKort(w.datum)}</td>
              <td className="py-2 pr-4 tabular-nums">{bedragFormat.format(w.waarde)}</td>
              <td className="py-2 pr-4 text-neutral-600 dark:text-neutral-400">{w.bron ?? "—"}</td>
              <td className="py-2 pr-4 text-neutral-600 dark:text-neutral-400">{w.opmerking ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
