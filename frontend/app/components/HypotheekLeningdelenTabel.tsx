"use client";

import type { Leningdeel } from "@/lib/api";
import { formatteerDatumKort } from "@/lib/periode";

const bedragFormat = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });
const percentageFormat = new Intl.NumberFormat("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 4 });

const TYPE_LABEL: Record<string, string> = {
  annuiteit: "Annuïteit",
  lineair: "Lineair",
  aflossingsvrij: "Aflossingsvrij",
};

interface HypotheekLeningdelenTabelProps {
  leningdelen: Leningdeel[];
  onRijKlik: (leningdeel: Leningdeel) => void;
}

export function HypotheekLeningdelenTabel({ leningdelen, onRijKlik }: HypotheekLeningdelenTabelProps) {
  if (leningdelen.length === 0) {
    return <p className="py-6 text-center text-sm text-neutral-400">Nog geen leningdelen ingevoerd.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-neutral-300 dark:border-neutral-700">
            <th className="py-2 pr-4 font-medium text-neutral-600 dark:text-neutral-400">Leningdeel</th>
            <th className="py-2 pr-4 font-medium text-neutral-600 dark:text-neutral-400">Hoofdsom</th>
            <th className="py-2 pr-4 font-medium text-neutral-600 dark:text-neutral-400">Rente</th>
            <th className="py-2 pr-4 font-medium text-neutral-600 dark:text-neutral-400">Startdatum</th>
            <th className="py-2 pr-4 font-medium text-neutral-600 dark:text-neutral-400">Looptijd</th>
            <th className="py-2 font-medium text-neutral-600 dark:text-neutral-400">Actuele schuld</th>
          </tr>
        </thead>
        <tbody>
          {leningdelen.map((l) => (
            <tr
              key={l.id}
              onClick={() => onRijKlik(l)}
              className="cursor-pointer border-b border-neutral-200 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900/60"
            >
              <td className="py-2 pr-4">
                <div className="text-neutral-900 dark:text-neutral-100">{l.naam}</div>
                <div className="text-xs text-neutral-400">{TYPE_LABEL[l.type] ?? l.type}</div>
              </td>
              <td className="py-2 pr-4 tabular-nums">{bedragFormat.format(l.hoofdsom)}</td>
              <td className="py-2 pr-4 tabular-nums">{percentageFormat.format(l.rente_percentage)}%</td>
              <td className="py-2 pr-4 whitespace-nowrap tabular-nums">{formatteerDatumKort(l.startdatum)}</td>
              <td className="py-2 pr-4 tabular-nums">{l.looptijd_maanden} mnd</td>
              <td className="py-2 tabular-nums font-medium text-neutral-900 dark:text-neutral-100">
                {bedragFormat.format(l.actuele_schuld)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
