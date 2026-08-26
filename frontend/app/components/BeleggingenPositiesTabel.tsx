"use client";

import type { Positie } from "@/lib/api";

const bedragFormat = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });
const aantalFormat = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 6 });

// Prijs per stuk op 3 decimalen — bij lagere koersen (bv. penny stocks,
// sommige ETF's) geeft 2 decimalen te veel afronding om zinvol te zijn.
function formatteerPrijsPerStuk(bedrag: number, valuta: string): string {
  try {
    return new Intl.NumberFormat("nl-NL", {
      style: "currency", currency: valuta, minimumFractionDigits: 3, maximumFractionDigits: 3,
    }).format(bedrag);
  } catch {
    return `${bedrag.toFixed(3)} ${valuta}`;
  }
}

export function BeleggingenPositiesTabel({ posities }: { posities: Positie[] }) {
  if (posities.length === 0) {
    return <p className="py-6 text-center text-sm text-neutral-400">Geen open posities.</p>;
  }

  const totaleWaarde = posities.reduce((som, p) => som + (p.huidige_waarde ?? 0), 0);
  const totaalResultaat = posities.reduce((som, p) => som + (p.resultaat ?? 0), 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-neutral-300 dark:border-neutral-700">
            <th className="py-2 pr-4 font-medium text-neutral-600 dark:text-neutral-400">Aandeel/tracker</th>
            <th className="py-2 pr-4 font-medium text-neutral-600 dark:text-neutral-400">Aantal</th>
            <th className="py-2 pr-4 font-medium text-neutral-600 dark:text-neutral-400">Gem. aankoopprijs</th>
            <th className="py-2 pr-4 font-medium text-neutral-600 dark:text-neutral-400">Laatste koers</th>
            <th className="py-2 pr-4 font-medium text-neutral-600 dark:text-neutral-400">Waarde</th>
            <th className="py-2 font-medium text-neutral-600 dark:text-neutral-400">Resultaat</th>
          </tr>
        </thead>
        <tbody>
          {posities.map((p) => (
            <tr key={p.code} className="border-b border-neutral-200 dark:border-neutral-800">
              <td className="py-2 pr-4">
                <div className="text-neutral-900 dark:text-neutral-100">{p.naam}</div>
                <div className="text-xs text-neutral-400">{p.code}</div>
              </td>
              <td className="py-2 pr-4 tabular-nums">{aantalFormat.format(p.aantal)}</td>
              <td className="py-2 pr-4 tabular-nums">{formatteerPrijsPerStuk(p.gem_aankoopprijs, p.valuta)}</td>
              <td className="py-2 pr-4 tabular-nums">
                {p.laatste_koers !== null ? formatteerPrijsPerStuk(p.laatste_koers, p.valuta) : "—"}
              </td>
              <td className="py-2 pr-4 tabular-nums">
                {p.huidige_waarde !== null ? bedragFormat.format(p.huidige_waarde) : "—"}
              </td>
              <td
                className={
                  "py-2 tabular-nums " +
                  (p.resultaat === null
                    ? "text-neutral-400"
                    : p.resultaat >= 0
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-red-700 dark:text-red-400")
                }
              >
                {p.resultaat !== null ? bedragFormat.format(p.resultaat) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-neutral-300 font-medium dark:border-neutral-700">
            <td className="py-2 pr-4 text-neutral-900 dark:text-neutral-100" colSpan={4}>
              Totaal
            </td>
            <td className="py-2 pr-4 tabular-nums text-neutral-900 dark:text-neutral-100">
              {bedragFormat.format(totaleWaarde)}
            </td>
            <td
              className={
                "py-2 tabular-nums " +
                (totaalResultaat >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400")
              }
            >
              {bedragFormat.format(totaalResultaat)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
