"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const MAX_RESULTATEN = 50;

interface ComboboxProps {
  label: string;
  opties: string[];
  waarde: string | null;
  onChange: (waarde: string | null) => void;
  placeholder?: string;
}

export function Combobox({ label, opties, waarde, onChange, placeholder = "Alle" }: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [zoektekst, setZoektekst] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function klikBuiten(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setZoektekst("");
      }
    }
    document.addEventListener("mousedown", klikBuiten);
    return () => document.removeEventListener("mousedown", klikBuiten);
  }, []);

  const gefilterd = useMemo(() => {
    if (!zoektekst) return opties.slice(0, MAX_RESULTATEN);
    const q = zoektekst.toLowerCase();
    return opties.filter((o) => o.toLowerCase().includes(q)).slice(0, MAX_RESULTATEN);
  }, [opties, zoektekst]);

  const totaalMatches = zoektekst
    ? opties.filter((o) => o.toLowerCase().includes(zoektekst.toLowerCase())).length
    : opties.length;

  function selecteer(o: string | null) {
    onChange(o);
    setZoektekst("");
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
      {label}
      <div className="relative">
        <input
          type="text"
          className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-base text-neutral-900 sm:text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
          placeholder={placeholder}
          value={open ? zoektekst : (waarde ?? "")}
          onFocus={() => {
            setOpen(true);
            setZoektekst("");
          }}
          onChange={(e) => setZoektekst(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              setZoektekst("");
            }
            if (e.key === "Enter" && gefilterd.length > 0) {
              selecteer(gefilterd[0]);
            }
          }}
        />
        {waarde && !open && (
          <button
            type="button"
            aria-label="Wis selectie"
            onClick={() => selecteer(null)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
          >
            ×
          </button>
        )}
      </div>
      {open && (
        <div className="fixed inset-x-4 top-1/2 z-20 max-h-72 -translate-y-1/2 overflow-y-auto rounded-md border border-neutral-300 bg-white shadow-lg sm:absolute sm:inset-x-auto sm:top-full sm:left-0 sm:z-10 sm:mt-1 sm:w-full sm:min-w-[16rem] sm:translate-y-0 dark:border-neutral-700 dark:bg-neutral-900">
          <button
            type="button"
            onClick={() => selecteer(null)}
            className="block w-full px-3 py-2 text-left text-sm text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
          >
            {placeholder}
          </button>
          {gefilterd.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => selecteer(o)}
              className="block w-full truncate px-3 py-2 text-left text-sm text-neutral-900 hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-800"
            >
              {o}
            </button>
          ))}
          {totaalMatches > MAX_RESULTATEN && (
            <div className="px-3 py-2 text-xs text-neutral-400">
              {totaalMatches - MAX_RESULTATEN} meer — typ om te verfijnen
            </div>
          )}
          {gefilterd.length === 0 && (
            <div className="px-3 py-2 text-sm text-neutral-400">Geen resultaten</div>
          )}
        </div>
      )}
    </div>
  );
}
