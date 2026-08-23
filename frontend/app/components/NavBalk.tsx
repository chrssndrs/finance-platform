"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const DOMEINEN = [
  { pad: "/uitgaven", label: "Uitgaven" },
  { pad: "/inboedel", label: "Inboedel" },
  { pad: "/abonnementen", label: "Abonnementen" },
  { pad: "/beleggingen", label: "Beleggingen" },
  { pad: "/vastgoed", label: "Vastgoed" },
  { pad: "/hypotheek", label: "Hypotheek" },
];

const iconKnopKlasse =
  "rounded-md p-2 text-lg leading-none text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800";

export function NavBalk({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

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

  return (
    <>
      <nav className="sticky top-0 z-30 h-14 border-b border-neutral-200 bg-[var(--background)] dark:border-neutral-800">
        <div className="mx-auto flex h-full w-full max-w-3xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="font-display text-xl italic text-neutral-900 dark:text-neutral-100"
            >
              Libreo
            </Link>

            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-label="Menu"
              aria-expanded={open}
              className="p-2 text-neutral-600 sm:hidden dark:text-neutral-300"
            >
              <span className="block h-0.5 w-5 bg-current" />
              <span className="mt-1 block h-0.5 w-5 bg-current" />
              <span className="mt-1 block h-0.5 w-5 bg-current" />
            </button>

            <div className="hidden gap-1 sm:flex">
              {DOMEINEN.map((d) => {
                const actief = pathname === d.pad;
                return (
                  <Link
                    key={d.pad}
                    href={d.pad}
                    className={
                      "border-b-2 px-3 py-3 text-sm font-medium transition-colors " +
                      (actief
                        ? "border-neutral-900 text-neutral-900 dark:border-neutral-100 dark:text-neutral-100"
                        : "border-transparent text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100")
                    }
                  >
                    {d.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Link href="/" aria-label="Home" className={iconKnopKlasse}>
              🏠
            </Link>
            <Link href="/instellingen" aria-label="Instellingen" className={iconKnopKlasse}>
              ⚙️
            </Link>
          </div>
        </div>
      </nav>

      {/* Ligt "achter" de content — wordt zichtbaar zodra de content hieronder naar rechts schuift. */}
      <div className="fixed inset-y-0 left-0 z-10 w-72 overflow-y-auto border-r border-neutral-200 bg-white pt-14 sm:hidden dark:border-neutral-800 dark:bg-neutral-900">
        {DOMEINEN.map((d) => {
          const actief = pathname === d.pad;
          return (
            <Link
              key={d.pad}
              href={d.pad}
              onClick={() => setOpen(false)}
              className={
                "block px-6 py-3 text-sm font-medium " +
                (actief
                  ? "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
                  : "text-neutral-600 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-800")
              }
            >
              {d.label}
            </Link>
          );
        })}
      </div>

      <div
        onClick={() => open && setOpen(false)}
        className={
          "relative z-20 min-h-screen bg-[var(--background)] transition-transform duration-300 ease-out " +
          (open ? "translate-x-72" : "translate-x-0")
        }
      >
        {children}
      </div>
    </>
  );
}
