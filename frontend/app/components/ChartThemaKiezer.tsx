"use client";

import { useEffect, useSyncExternalStore } from "react";

import { CHART_THEMA_OPSLAGSLEUTEL, CHART_THEMA_OPTIES, leesOpgeslagenChartThema, pasChartThemaToe } from "@/lib/chartThema";

function serverThema() {
  return "standaard" as const;
}

const luisteraars = new Set<() => void>();

function subscribe(callback: () => void) {
  luisteraars.add(callback);
  return () => luisteraars.delete(callback);
}

export function ChartThemaKiezer() {
  const thema = useSyncExternalStore(subscribe, leesOpgeslagenChartThema, serverThema);

  useEffect(() => {
    pasChartThemaToe(thema);
  }, [thema]);

  function kies(waarde: string) {
    localStorage.setItem(CHART_THEMA_OPSLAGSLEUTEL, waarde);
    luisteraars.forEach((cb) => cb());
  }

  return (
    <div className="flex flex-wrap gap-2">
      {CHART_THEMA_OPTIES.map((optie) => (
        <button
          key={optie.waarde}
          type="button"
          onClick={() => kies(optie.waarde)}
          className={
            "flex items-center gap-2 rounded-md border px-3 py-2 text-sm " +
            (thema === optie.waarde
              ? "border-neutral-900 dark:border-neutral-100"
              : "border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800")
          }
        >
          <span className="flex gap-0.5">
            {optie.voorbeeld.map((kleur, i) => (
              <span key={i} className="h-3 w-3 rounded-full" style={{ backgroundColor: kleur }} />
            ))}
          </span>
          <span className="text-neutral-700 dark:text-neutral-300">{optie.label}</span>
        </button>
      ))}
    </div>
  );
}
