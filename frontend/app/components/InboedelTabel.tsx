"use client";

import { useMemo, useState } from "react";

import type { InboedelArtikel } from "@/lib/api";

const bedragFormat = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });
const datumFormat = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", year: "numeric" });

type SortKey =
  | "omschrijving"
  | "merk"
  | "model"
  | "winkel"
  | "bedrag"
  | "datum"
  | "levensduur_maanden"
  | "restwaarde"
  | "serienummer"
  | "wordt_vervangen";

const KOLOMMEN: { key: SortKey; label: string }[] = [
  { key: "omschrijving", label: "Omschrijving" },
  { key: "merk", label: "Merk" },
  { key: "model", label: "Model" },
  { key: "winkel", label: "Winkel" },
  { key: "bedrag", label: "Bedrag" },
  { key: "datum", label: "Datum" },
  { key: "levensduur_maanden", label: "Levensduur" },
  { key: "restwaarde", label: "Restwaarde" },
  { key: "serienummer", label: "Serienummer" },
  { key: "wordt_vervangen", label: "Vervangen?" },
];

function vergelijk(a: InboedelArtikel, key: SortKey): string | number {
  const v = a[key];
  if (typeof v === "boolean") return v ? 1 : 0;
  if (v === null || v === undefined) return key === "bedrag" || key === "levensduur_maanden" || key === "restwaarde" ? -Infinity : "";
  return v;
}

interface InboedelTabelProps {
  artikelen: InboedelArtikel[];
  onRijKlik: (artikel: InboedelArtikel) => void;
}

export function InboedelTabel({ artikelen, onRijKlik }: InboedelTabelProps) {
  const [sortKey, setSortKey] = useState<SortKey>("omschrijving");
  const [aflopend, setAflopend] = useState(false);

  const gesorteerd = useMemo(() => {
    const kopie = [...artikelen];
    kopie.sort((a, b) => {
      const va = vergelijk(a, sortKey);
      const vb = vergelijk(b, sortKey);
      const vergelijking = typeof va === "string" ? va.localeCompare(vb as string) : (va as number) - (vb as number);
      return aflopend ? -vergelijking : vergelijking;
    });
    return kopie;
  }, [artikelen, sortKey, aflopend]);

  function klikKolom(key: SortKey) {
    if (key === sortKey) {
      setAflopend((v) => !v);
    } else {
      setSortKey(key);
      setAflopend(false);
    }
  }

  if (artikelen.length === 0) {
    return <p className="py-6 text-center text-sm text-neutral-400">Geen artikelen.</p>;
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
          {gesorteerd.map((a) => (
            <tr
              key={a.id}
              onClick={() => onRijKlik(a)}
              className="cursor-pointer border-b border-neutral-200 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900/60"
            >
              <td className="py-2 pr-4">{a.omschrijving}</td>
              <td className="py-2 pr-4 text-neutral-600 dark:text-neutral-400">{a.merk ?? "—"}</td>
              <td className="py-2 pr-4 text-neutral-600 dark:text-neutral-400">{a.model ?? "—"}</td>
              <td className="py-2 pr-4 text-neutral-600 dark:text-neutral-400">{a.winkel ?? "—"}</td>
              <td className="py-2 pr-4 tabular-nums">{a.bedrag !== null ? bedragFormat.format(a.bedrag) : "—"}</td>
              <td className="whitespace-nowrap py-2 pr-4 tabular-nums">
                {a.datum ? datumFormat.format(new Date(`${a.datum}T00:00:00`)) : "—"}
              </td>
              <td className="whitespace-nowrap py-2 pr-4 tabular-nums">
                {a.levensduur_maanden !== null ? `${a.levensduur_maanden} mnd` : "—"}
              </td>
              <td className="py-2 pr-4 tabular-nums">
                {a.restwaarde !== null ? bedragFormat.format(a.restwaarde) : "—"}
              </td>
              <td className="py-2 pr-4 text-neutral-600 dark:text-neutral-400">{a.serienummer ?? "—"}</td>
              <td className="py-2 pr-4 text-neutral-600 dark:text-neutral-400">{a.wordt_vervangen ? "Ja" : "Nee"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
