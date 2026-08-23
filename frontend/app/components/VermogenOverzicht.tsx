"use client";

import type { VermogenOnderdeel } from "@/lib/api";
import { formatteerDatumKort } from "@/lib/periode";

const bedragFormat = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });

export function VermogenOverzicht({ totaal, onderdelen }: { totaal: number; onderdelen: VermogenOnderdeel[] }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="text-sm text-neutral-500 dark:text-neutral-400">Totaal vermogen</div>
      <div className="text-3xl font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
        {bedragFormat.format(totaal)}
      </div>

      <div className="mt-4 flex flex-col gap-2 border-t border-neutral-200 pt-3 dark:border-neutral-800">
        {onderdelen.map((o) => (
          <div key={o.label} className="flex items-center justify-between text-sm">
            <span className="text-neutral-600 dark:text-neutral-400">{o.label}</span>
            <div className="text-right">
              <span
                className={
                  "tabular-nums font-medium " +
                  (o.type === "schuld"
                    ? "text-red-700 dark:text-red-400"
                    : "text-neutral-900 dark:text-neutral-100")
                }
              >
                {o.type === "schuld" ? "− " : ""}
                {bedragFormat.format(o.bedrag)}
              </span>
              <div className="text-xs text-neutral-400">
                {o.laatst_bijgewerkt ? `bijgewerkt op ${formatteerDatumKort(o.laatst_bijgewerkt)}` : "nog geen data"}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
