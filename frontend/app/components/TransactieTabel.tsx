"use client";

import type { Transactie } from "@/lib/api";

const bedragFormat = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });
const datumFormat = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", year: "numeric" });

interface TransactieTabelProps {
  titel: string;
  transacties: Transactie[];
  laden: boolean;
  onSluiten: () => void;
}

export function TransactieTabel({ titel, transacties, laden, onSluiten }: TransactieTabelProps) {
  return (
    <div className="rounded-md border border-neutral-200 dark:border-neutral-800">
      <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
        <h2 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{titel}</h2>
        <button
          type="button"
          onClick={onSluiten}
          aria-label="Sluiten"
          className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
        >
          ×
        </button>
      </div>

      <div className={laden ? "opacity-50 transition-opacity" : "transition-opacity"}>
        {transacties.length === 0 && !laden ? (
          <p className="px-4 py-6 text-center text-sm text-neutral-400">Geen transacties in deze periode.</p>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">
                  <th className="px-4 py-2 font-medium">Datum</th>
                  <th className="px-4 py-2 font-medium">Tegenpartij</th>
                  <th className="px-4 py-2 font-medium">Bedrag</th>
                  <th className="px-4 py-2 font-medium">Mededeling</th>
                </tr>
              </thead>
              <tbody>
                {transacties.map((t) => (
                  <tr key={t.transactie_id} className="border-b border-neutral-100 dark:border-neutral-900">
                    <td className="whitespace-nowrap px-4 py-2">{datumFormat.format(new Date(`${t.datum}T00:00:00`))}</td>
                    <td className="px-4 py-2">{t.afzender}</td>
                    <td
                      className={
                        "whitespace-nowrap px-4 py-2 tabular-nums " +
                        (t.bedrag_eur < 0 ? "text-neutral-900 dark:text-neutral-100" : "text-emerald-700 dark:text-emerald-400")
                      }
                    >
                      {bedragFormat.format(t.bedrag_eur)}
                    </td>
                    <td className="max-w-xs truncate px-4 py-2 text-neutral-500 dark:text-neutral-400" title={t.mededelingen ?? ""}>
                      {t.mededelingen ?? ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
