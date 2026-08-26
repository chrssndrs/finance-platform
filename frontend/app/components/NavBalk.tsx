"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { UploadKiezerOverlay } from "@/app/components/UploadKiezerOverlay";

interface NavItem {
  pad: string;
  label: string;
}

interface NavGroep {
  titel: string;
  items: NavItem[];
}

const NAV_GROEPEN: NavGroep[] = [
  {
    titel: "Geld",
    items: [
      { pad: "/uitgaven", label: "Uitgaven" },
      { pad: "/vaste-lasten", label: "Vaste lasten" },
      { pad: "/cash", label: "Cash" },
    ],
  },
  {
    titel: "Vermogen",
    items: [
      { pad: "/vermogen", label: "Vermogen" },
      { pad: "/beleggingen", label: "Beleggingen" },
      { pad: "/woning", label: "Woning" },
      { pad: "/sparen", label: "Sparen" },
    ],
  },
  {
    titel: "Plannen",
    items: [
      { pad: "/planning", label: "Planning" },
      { pad: "/spullen", label: "Spullen" },
    ],
  },
];

const iconKnopKlasse =
  "rounded-md p-2 text-lg leading-none text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800";

export function NavBalk({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [toonUpload, setToonUpload] = useState(false);
  const [openGroep, setOpenGroep] = useState<string | null>(null);
  const [mobielOpenGroep, setMobielOpenGroep] = useState<string | null>(null);
  const groepenRef = useRef<HTMLDivElement>(null);

  // Sluit een open desktop-dropdown zodra er ergens anders geklikt wordt.
  useEffect(() => {
    function opDocumentKlik(e: MouseEvent) {
      if (groepenRef.current && !groepenRef.current.contains(e.target as Node)) {
        setOpenGroep(null);
      }
    }
    document.addEventListener("click", opDocumentKlik);
    return () => document.removeEventListener("click", opDocumentKlik);
  }, []);

  // Swipe vanaf de linkerrand opent het menu i.p.v. de browser/PWA-terug-
  // navigatie te triggeren. preventDefault() op touchmove (non-passive
  // listener, anders werkt preventDefault niet) onderdrukt dat native
  // terug-gebaar zodra de swipe duidelijk horizontaal is.
  useEffect(() => {
    const RAND_PX = 24;
    const MIN_AFSTAND = 40;
    let start: { x: number; y: number } | null = null;
    let volgt = false;

    function touchStart(e: TouchEvent) {
      if (open) return;
      const t = e.touches[0];
      if (!t || t.clientX > RAND_PX) return;
      start = { x: t.clientX, y: t.clientY };
      volgt = true;
    }

    function touchMove(e: TouchEvent) {
      if (!volgt || !start) return;
      const t = e.touches[0];
      if (!t) return;
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      if (dx <= 0 || Math.abs(dx) <= Math.abs(dy)) return;
      e.preventDefault();
      if (dx > MIN_AFSTAND) {
        setOpen(true);
        volgt = false;
      }
    }

    function touchEnd() {
      volgt = false;
      start = null;
    }

    document.addEventListener("touchstart", touchStart, { passive: true });
    document.addEventListener("touchmove", touchMove, { passive: false });
    document.addEventListener("touchend", touchEnd);
    return () => {
      document.removeEventListener("touchstart", touchStart);
      document.removeEventListener("touchmove", touchMove);
      document.removeEventListener("touchend", touchEnd);
    };
  }, [open]);

  function groepActief(groep: NavGroep) {
    return groep.items.some((item) => pathname === item.pad);
  }

  return (
    <>
      <nav className="sticky top-0 z-30 h-14 border-b border-neutral-200 bg-[var(--background)] dark:border-neutral-800">
        <div className="mx-auto flex h-full w-full max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-label="Menu"
              aria-expanded={open}
              className="-ml-2 p-2 text-neutral-600 sm:hidden dark:text-neutral-300"
            >
              <span className="block h-0.5 w-5 bg-current" />
              <span className="mt-1 block h-0.5 w-5 bg-current" />
              <span className="mt-1 block h-0.5 w-5 bg-current" />
            </button>

            <Link
              href="/"
              className="font-display text-xl italic text-neutral-900 dark:text-neutral-100"
            >
              Libreo
            </Link>

            <div ref={groepenRef} className="hidden gap-1 sm:flex">
              {NAV_GROEPEN.map((groep) => {
                const actief = groepActief(groep);
                return (
                  <div key={groep.titel} className="relative">
                    <button
                      type="button"
                      onClick={() => setOpenGroep((g) => (g === groep.titel ? null : groep.titel))}
                      className={
                        "flex items-center gap-1 border-b-2 px-3 py-3 text-sm font-medium transition-colors " +
                        (actief
                          ? "border-neutral-900 text-neutral-900 dark:border-neutral-100 dark:text-neutral-100"
                          : "border-transparent text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100")
                      }
                    >
                      {groep.titel}
                      <span className="text-[10px]">▾</span>
                    </button>
                    {openGroep === groep.titel && (
                      <div className="absolute left-0 top-full z-40 min-w-40 rounded-md border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
                        {groep.items.map((item) => (
                          <Link
                            key={item.pad}
                            href={item.pad}
                            onClick={() => setOpenGroep(null)}
                            className={
                              "block px-3 py-2 text-sm " +
                              (pathname === item.pad
                                ? "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
                                : "text-neutral-600 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-800")
                            }
                          >
                            {item.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Link href="/" aria-label="Home" className={iconKnopKlasse}>
              🏠
            </Link>
            <button
              type="button"
              onClick={() => setToonUpload(true)}
              aria-label="Uploaden"
              className={iconKnopKlasse}
            >
              ⬆️
            </button>
            <Link href="/instellingen" aria-label="Instellingen" className={iconKnopKlasse}>
              ⚙️
            </Link>
          </div>
        </div>
      </nav>

      {/* Ligt "achter" de content — wordt zichtbaar zodra de content hieronder naar rechts schuift. */}
      <div className="fixed inset-y-0 left-0 z-10 w-72 overflow-y-auto border-r border-neutral-200 bg-white pt-14 sm:hidden dark:border-neutral-800 dark:bg-neutral-900">
        {NAV_GROEPEN.map((groep) => {
          const groepOpen = mobielOpenGroep === groep.titel;
          return (
            <div key={groep.titel}>
              <button
                type="button"
                onClick={() => setMobielOpenGroep((g) => (g === groep.titel ? null : groep.titel))}
                className={
                  "flex w-full items-center justify-between px-6 py-3 text-sm font-semibold " +
                  (groepActief(groep)
                    ? "text-neutral-900 dark:text-neutral-100"
                    : "text-neutral-600 dark:text-neutral-300")
                }
              >
                {groep.titel}
                <span className="text-xs">{groepOpen ? "▼" : "▶"}</span>
              </button>
              {groepOpen &&
                groep.items.map((item) => {
                  const actief = pathname === item.pad;
                  return (
                    <Link
                      key={item.pad}
                      href={item.pad}
                      onClick={() => setOpen(false)}
                      className={
                        "block py-3 pl-10 pr-6 text-sm font-medium " +
                        (actief
                          ? "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
                          : "text-neutral-600 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-800")
                      }
                    >
                      {item.label}
                    </Link>
                  );
                })}
            </div>
          );
        })}
      </div>

      <div
        onClick={() => open && setOpen(false)}
        className={
          // Geen "transform" zetten (zelfs niet translate-x-0) zolang het
          // menu dicht is: elke transform-waarde — ook 0 — maakt dit element
          // een containing block voor position:fixed-nakomelingen (bv. de
          // Overlay-kaartjes), waardoor die niet meer t.o.v. het echte
          // viewport positioneren maar t.o.v. déze div. Dat zorgde ervoor
          // dat een overlay na scrollen half buiten beeld viel.
          "relative z-20 min-h-screen bg-[var(--background)] transition-transform duration-300 ease-out " +
          (open ? "translate-x-72" : "")
        }
      >
        {children}
      </div>

      <UploadKiezerOverlay open={toonUpload} onClose={() => setToonUpload(false)} />
    </>
  );
}
