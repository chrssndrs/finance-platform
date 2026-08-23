"use client";

import { useEffect, useRef, useState } from "react";

import type { Granulariteit } from "@/lib/api";
import {
  EENHEID_MEERVOUD,
  labelPeriodeSelectie,
  SNELKEUZES,
  type PeriodeSelectie,
} from "@/lib/periode";

const EENHEDEN: Granulariteit[] = ["dag", "week", "maand", "jaar"];

interface DatumRangeKiezerProps {
  selectie: PeriodeSelectie;
  onChange: (selectie: PeriodeSelectie) => void;
}

export function DatumRangeKiezer({ selectie, onChange }: DatumRangeKiezerProps) {
  const [open, setOpen] = useState(false);
  const [aangepastAantal, setAangepastAantal] = useState(1);
  const [aangepastEenheid, setAangepastEenheid] = useState<Granulariteit>("maand");
  const [van, setVan] = useState("");
  const [tot, setTot] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function klikBuiten(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", klikBuiten);
    return () => document.removeEventListener("mousedown", klikBuiten);
  }, []);

  function kies(nieuw: PeriodeSelectie) {
    onChange(nieuw);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
      Periode
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-left text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
      >
        {labelPeriodeSelectie(selectie)}
      </button>

      {open && (
        <div className="absolute top-full right-0 z-10 mt-1 w-72 max-w-[90vw] rounded-md border border-neutral-300 bg-white p-3 shadow-lg sm:right-auto dark:border-neutral-700 dark:bg-neutral-900">
          <button
            type="button"
            onClick={() => kies({ modus: "alles" })}
            className="mb-2 block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            Alles
          </button>

          <div className="mb-3 flex flex-wrap gap-1.5">
            {SNELKEUZES.map((s) => (
              <button
                key={`${s.aantal}-${s.eenheid}`}
                type="button"
                onClick={() => kies({ modus: "relatief", aantal: s.aantal, eenheid: s.eenheid })}
                className="rounded-full border border-neutral-300 px-2.5 py-1 text-xs text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                Laatste {s.aantal} {EENHEID_MEERVOUD[s.eenheid]}
              </button>
            ))}
          </div>

          <div className="mb-3 border-t border-neutral-200 pt-3 dark:border-neutral-800">
            <div className="mb-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">Laatste ... periode</div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                value={aangepastAantal}
                onChange={(e) => setAangepastAantal(Math.max(1, Number(e.target.value)))}
                className="w-16 rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-base text-neutral-900 sm:text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
              />
              <select
                value={aangepastEenheid}
                onChange={(e) => setAangepastEenheid(e.target.value as Granulariteit)}
                className="flex-1 rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-base text-neutral-900 sm:text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
              >
                {EENHEDEN.map((e) => (
                  <option key={e} value={e}>
                    {EENHEID_MEERVOUD[e]}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => kies({ modus: "relatief", aantal: aangepastAantal, eenheid: aangepastEenheid })}
                className="rounded-md bg-neutral-900 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
              >
                Toepassen
              </button>
            </div>
          </div>

          <div className="border-t border-neutral-200 pt-3 dark:border-neutral-800">
            <div className="mb-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">Aangepast bereik</div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={van}
                onChange={(e) => setVan(e.target.value)}
                className="w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-base text-neutral-900 sm:text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
              />
              <span className="text-neutral-400">–</span>
              <input
                type="date"
                value={tot}
                onChange={(e) => setTot(e.target.value)}
                className="w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-base text-neutral-900 sm:text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
              />
            </div>
            <button
              type="button"
              disabled={!van || !tot}
              onClick={() => kies({ modus: "aangepast", vanaf: van, tot })}
              className="mt-2 w-full rounded-md bg-neutral-900 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-neutral-700 disabled:opacity-40 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
            >
              Toepassen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
