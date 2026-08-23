"use client";

import { useEffect, useRef, useState } from "react";

import { zoekTicker, type TickerZoekResultaat } from "@/lib/api";

const DEBOUNCE_MS = 300;

interface TickerZoekerProps {
  code: string;
  onGekozen: (resultaat: TickerZoekResultaat) => void;
  onCodeTypen: (code: string) => void;
}

export function TickerZoeker({ code, onGekozen, onCodeTypen }: TickerZoekerProps) {
  const [open, setOpen] = useState(false);
  const [bezig, setBezig] = useState(false);
  const [resultaten, setResultaten] = useState<TickerZoekResultaat[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function klikBuiten(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", klikBuiten);
    return () => document.removeEventListener("mousedown", klikBuiten);
  }, []);

  function invoerGewijzigd(waarde: string) {
    onCodeTypen(waarde);
    setOpen(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (waarde.trim().length < 2) {
      setResultaten([]);
      return;
    }
    timerRef.current = setTimeout(async () => {
      setBezig(true);
      try {
        const res = await zoekTicker(waarde.trim());
        setResultaten(res.resultaten);
      } catch {
        setResultaten([]);
      } finally {
        setBezig(false);
      }
    }, DEBOUNCE_MS);
  }

  function kiezen(resultaat: TickerZoekResultaat) {
    onGekozen(resultaat);
    setResultaten([]);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
      Aandeel/tracker
      <input
        type="text"
        required
        placeholder="Zoek op naam, bv. ASML"
        value={code}
        onFocus={() => setOpen(true)}
        onChange={(e) => invoerGewijzigd(e.target.value)}
        className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-base text-neutral-900 sm:text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
      />
      {open && (code.trim().length >= 2) && (
        <div className="fixed inset-x-4 top-1/2 z-20 max-h-72 -translate-y-1/2 overflow-y-auto rounded-md border border-neutral-300 bg-white shadow-lg sm:absolute sm:inset-x-auto sm:top-full sm:left-0 sm:z-10 sm:mt-1 sm:w-full sm:min-w-[20rem] sm:translate-y-0 dark:border-neutral-700 dark:bg-neutral-900">
          {bezig && <div className="px-3 py-2 text-sm text-neutral-400">Zoeken...</div>}
          {!bezig && resultaten.length === 0 && (
            <div className="px-3 py-2 text-sm text-neutral-400">
              Geen resultaten — je kunt de code ook direct intypen
            </div>
          )}
          {!bezig &&
            resultaten.map((r) => (
              <button
                key={r.symbol}
                type="button"
                onClick={() => kiezen(r)}
                className="block w-full truncate px-3 py-2 text-left text-sm text-neutral-900 hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-800"
              >
                {r.naam} <span className="text-neutral-400">({r.symbol} · {r.beurs})</span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
