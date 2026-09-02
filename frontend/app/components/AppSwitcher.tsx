"use client";

import { useEffect, useRef, useState } from "react";

/** Zwevende app-schakelaar (rechtsonder), zoals de "waffle" van Google of
 * Microsoft: één klik om naar een andere app of terug naar de
 * platform-startpagina te gaan.
 *
 * Deze component is bewust zelfstandig en per app gedupliceerd — de apps
 * zijn losse repo's zonder gedeelde code. De URL's komen uit
 * NEXT_PUBLIC_*-vars (build-time), met dezelfde poort-defaults als het
 * familie-platform gebruikt.
 */

interface App {
  naam: string;
  url: string;
  icoon: string;
  kleur: string;
}

// Pas dit aan als er een app bijkomt (en voeg de env-var toe aan
// .env.example / docker-compose.yml / Dockerfile).
const APPS: App[] = [
  {
    naam: "Finance",
    url: process.env.NEXT_PUBLIC_FINANCE_URL || "http://localhost:3000",
    icoon: "💶",
    kleur: "bg-emerald-100 dark:bg-emerald-900",
  },
  {
    naam: "Wensen",
    url: process.env.NEXT_PUBLIC_WENSEN_URL || "http://localhost:3030",
    icoon: "🎁",
    kleur: "bg-rose-100 dark:bg-rose-900",
  },
  {
    naam: "Bookmarks",
    url: process.env.NEXT_PUBLIC_BOOKMARKS_URL || "http://localhost:3040",
    icoon: "🔖",
    kleur: "bg-sky-100 dark:bg-sky-900",
  },
  {
    naam: "Vakantiedagen",
    url: process.env.NEXT_PUBLIC_VAKANTIEDAGEN_URL || "http://localhost:3050",
    icoon: "🏖️",
    kleur: "bg-cyan-100 dark:bg-cyan-900",
  },
];

const PLATFORM_URL = process.env.NEXT_PUBLIC_PLATFORM_URL || "http://localhost:3020";

/** `huidige`: naam van de app waarin deze switcher staat — die wordt
 * gemarkeerd en linkt niet naar zichzelf. */
export default function AppSwitcher({ huidige }: { huidige?: string }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function bijKlik(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    function bijToets(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", bijKlik);
    document.addEventListener("keydown", bijToets);
    return () => {
      document.removeEventListener("mousedown", bijKlik);
      document.removeEventListener("keydown", bijToets);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="fixed bottom-5 right-5 z-40 print:hidden">
      {open && (
        <div className="absolute bottom-14 right-0 w-60 rounded-2xl border border-neutral-200 bg-white p-3 shadow-2xl dark:border-neutral-700 dark:bg-neutral-900">
          <a
            href={PLATFORM_URL}
            className="mb-2 flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-100 text-base dark:bg-neutral-800">
              🏠
            </span>
            Familie Platform
          </a>

          <div className="mb-1 border-t border-neutral-200 pt-2 dark:border-neutral-800" />

          <div className="grid grid-cols-3 gap-1">
            {APPS.map((app) => {
              const isHuidige = app.naam === huidige;
              const inhoud = (
                <>
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-xl text-xl ${app.kleur}`}
                  >
                    {app.icoon}
                  </span>
                  <span className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
                    {app.naam}
                  </span>
                </>
              );
              const klasse =
                "flex flex-col items-center gap-1 rounded-lg px-1 py-2 text-center transition";
              if (isHuidige) {
                return (
                  <div
                    key={app.naam}
                    aria-current="page"
                    className={`${klasse} bg-neutral-100 dark:bg-neutral-800`}
                  >
                    {inhoud}
                  </div>
                );
              }
              return (
                <a
                  key={app.naam}
                  href={app.url}
                  className={`${klasse} hover:bg-neutral-100 dark:hover:bg-neutral-800`}
                >
                  {inhoud}
                </a>
              );
            })}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Andere apps"
        aria-expanded={open}
        title="Andere apps"
        className="flex h-11 w-11 items-center justify-center rounded-full border border-neutral-200 bg-white/90 text-neutral-600 shadow-lg backdrop-blur-md transition hover:bg-white hover:text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900/90 dark:text-neutral-300 dark:hover:bg-neutral-900"
      >
        {/* Klassiek 3x3 "waffle"-raster */}
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" fill="currentColor">
          {[1, 7, 13].map((y) =>
            [1, 7, 13].map((x) => <rect key={`${x}-${y}`} x={x} y={y} width="4" height="4" rx="1" />)
          )}
        </svg>
      </button>
    </div>
  );
}
