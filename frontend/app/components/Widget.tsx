"use client";

import { useEffect, useState } from "react";

import { TotalenChart } from "@/app/components/TotalenChart";
import { TransactieTabel } from "@/app/components/TransactieTabel";
import { ApiError, getTotalen, getTransacties, type PeriodeTotaal, type Transactie, type Widget as WidgetData } from "@/lib/api";
import { resolveerPeriodeSelectie, widgetPeriodeNaarSelectie } from "@/lib/periode";

const bedragFormat = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });

function widgetTitel(widget: WidgetData): string {
  if (widget.titel) return widget.titel;
  return widget.afzender ?? widget.subcategorie ?? widget.categorie ?? "Alle transacties";
}

interface WidgetProps {
  widget: WidgetData;
  onKlik: () => void;
  onOmhoog?: () => void;
  onOmlaag?: () => void;
}

export function Widget({ widget, onKlik, onOmhoog, onOmlaag }: WidgetProps) {
  const [reeks, setReeks] = useState<PeriodeTotaal[]>([]);
  const [transacties, setTransacties] = useState<Transactie[]>([]);
  const [laden, setLaden] = useState(true);
  const [foutmelding, setFoutmelding] = useState<string | null>(null);

  useEffect(() => {
    const { vanaf, tot } = resolveerPeriodeSelectie(widgetPeriodeNaarSelectie(widget));
    const params = {
      categorie: widget.categorie,
      subcategorie: widget.subcategorie,
      afzenders: widget.afzender ? [widget.afzender] : [],
      vanaf,
      tot,
    };

    if (widget.weergave === "transacties") {
      getTransacties({ ...params, vanaf: vanaf ?? "2000-01-01", tot: tot ?? new Date().toISOString().slice(0, 10) })
        .then((res) => setTransacties(res.transacties))
        .catch((err) => setFoutmelding(err instanceof ApiError ? err.message : "Kon widget niet laden."))
        .finally(() => setLaden(false));
    } else {
      getTotalen({ ...params, granulariteit: widget.granulariteit })
        .then((res) => setReeks(res.reeks))
        .catch((err) => setFoutmelding(err instanceof ApiError ? err.message : "Kon widget niet laden."))
        .finally(() => setLaden(false));
    }
  }, [widget]);

  const totaal = reeks.reduce((som, r) => som + r.totaal, 0);

  return (
    <div
      onClick={onKlik}
      className="cursor-pointer rounded-lg border border-neutral-200 bg-white p-4 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-900/60"
    >
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{widgetTitel(widget)}</h3>
        <div className="flex items-center gap-2 text-xs" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            disabled={!onOmhoog}
            onClick={onOmhoog}
            aria-label="Widget omhoog verplaatsen"
            className="text-neutral-500 hover:text-neutral-900 disabled:opacity-25 disabled:pointer-events-none dark:text-neutral-400 dark:hover:text-neutral-100"
          >
            ▲
          </button>
          <button
            type="button"
            disabled={!onOmlaag}
            onClick={onOmlaag}
            aria-label="Widget omlaag verplaatsen"
            className="text-neutral-500 hover:text-neutral-900 disabled:opacity-25 disabled:pointer-events-none dark:text-neutral-400 dark:hover:text-neutral-100"
          >
            ▼
          </button>
        </div>
      </div>

      {foutmelding && <p className="text-sm text-red-700 dark:text-red-400">{foutmelding}</p>}

      <div className={laden ? "opacity-50 transition-opacity" : "transition-opacity"}>
        {widget.weergave === "totaal" && (
          <div className="text-2xl font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
            {bedragFormat.format(totaal)}
          </div>
        )}
        {widget.weergave === "grafiek" && <TotalenChart reeks={reeks} granulariteit={widget.granulariteit} />}
        {widget.weergave === "transacties" && (
          <TransactieTabel titel="" transacties={transacties.slice(0, 10)} laden={laden} onSluiten={() => {}} />
        )}
      </div>
    </div>
  );
}
