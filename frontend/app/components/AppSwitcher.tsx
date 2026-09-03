"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  leesOpgeslagenThema,
  pasThemaToe,
  serverThema,
  subscribeThema,
  THEMA_ICOON,
  THEMA_LABEL,
  VOLGEND_THEMA,
  zetThema,
} from "@/lib/thema";

/** Zwevende app-schakelaar + thema-knop (rechtsonder), zoals de "waffle"
 * van Google of Microsoft: één klik om naar een andere app of terug naar
 * de platform-startpagina te gaan. De thema-knop zit hier bewust bij in
 * plaats van los per app geplaatst — dit bestand is toch al het ene
 * component dat letterlijk op elke pagina van elke app staat, dus dat is
 * de plek waar "overal hetzelfde gedrag" vanzelf klopt.
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
// .env.example / docker-compose.yml / Dockerfile van ELKE app — dit
// bestand staat overal apart).
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
  {
    naam: "Leeslijst",
    url: process.env.NEXT_PUBLIC_LEESLIJST_URL || "http://localhost:3060",
    icoon: "📚",
    kleur: "bg-amber-100 dark:bg-amber-900",
  },
  {
    naam: "Filmcollectie",
    url: process.env.NEXT_PUBLIC_FILMCOLLECTIE_URL || "http://localhost:3070",
    icoon: "🎬",
    kleur: "bg-violet-100 dark:bg-violet-900",
  },
  {
    naam: "Eetdagboek",
    url: process.env.NEXT_PUBLIC_EETDAGBOEK_URL || "http://localhost:3080",
    icoon: "🍽️",
    kleur: "bg-orange-100 dark:bg-orange-900",
  },
  {
    naam: "Ouderschapsverlof",
    url: process.env.NEXT_PUBLIC_OUDERSCHAPSVERLOF_URL || "http://localhost:3090",
    icoon: "👶",
    kleur: "bg-pink-100 dark:bg-pink-900",
  },
  {
    naam: "Kilometerregistratie",
    url: process.env.NEXT_PUBLIC_KILOMETERREGISTRATIE_URL || "http://localhost:3100",
    icoon: "🚗",
    kleur: "bg-lime-100 dark:bg-lime-900",
  },
];

const PLATFORM_URL = process.env.NEXT_PUBLIC_PLATFORM_URL || "http://localhost:3020";

// Thema-logica staat hier NIET inline zoals in de andere apps — finance-
// platform heeft al een eigen thema-knop in Instellingen, dus deze knop
// deelt @/lib/thema met die knop. Zonder die gedeelde module zouden twee
// losse kopieën elkaar niet zien reageren op een klik in de ander.
function ThemaKnop() {
  const thema = useSyncExternalStore(subscribeThema, leesOpgeslagenThema, serverThema);

  useEffect(() => {
    pasThemaToe(thema);
    if (thema !== "systeem") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => pasThemaToe("systeem");
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [thema]);

  return (
    <button
      type="button"
      onClick={() => zetThema(VOLGEND_THEMA[thema])}
      aria-label={`Thema: ${THEMA_LABEL[thema]}`}
      title={`Thema: ${THEMA_LABEL[thema]} (klik om te wisselen)`}
      className="flex h-11 w-11 items-center justify-center rounded-full border border-neutral-200 bg-white/90 text-base shadow-lg backdrop-blur-md transition hover:bg-white dark:border-neutral-700 dark:bg-neutral-900/90 dark:hover:bg-neutral-900"
    >
      <span aria-hidden="true">{THEMA_ICOON[thema]}</span>
    </button>
  );
}

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
    <div ref={containerRef} className="fixed bottom-5 right-5 z-40 flex items-end gap-2 print:hidden">
      {open && (
        <div className="absolute bottom-14 right-14 w-64 rounded-2xl border border-neutral-200 bg-white p-3 shadow-2xl dark:border-neutral-700 dark:bg-neutral-900">
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

          <div className="grid grid-cols-3 gap-x-1 gap-y-3">
            {APPS.map((app) => {
              const isHuidige = app.naam === huidige;
              const inhoud = (
                <>
                  <span
                    className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-xl ${app.kleur}`}
                  >
                    {app.icoon}
                  </span>
                  <span className="w-full break-words text-center text-[10px] font-medium leading-tight text-neutral-600 dark:text-neutral-400">
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

      <ThemaKnop />

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
