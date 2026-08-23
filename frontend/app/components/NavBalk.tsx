"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { ThemeToggle } from "@/app/components/ThemeToggle";

const DOMEINEN = [
  { pad: "/uitgaven", label: "Uitgaven" },
  { pad: "/inboedel", label: "Inboedel" },
  { pad: "/abonnementen", label: "Abonnementen" },
  { pad: "/beleggingen", label: "Beleggingen" },
];

export function NavBalk() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
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

  return (
    <nav ref={containerRef} className="relative border-b border-neutral-200 dark:border-neutral-800">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-6">
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

        <ThemeToggle />
      </div>

      {open && (
        <div className="absolute top-full left-0 z-20 w-full border-b border-neutral-200 bg-white shadow-lg sm:hidden dark:border-neutral-800 dark:bg-neutral-900">
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
      )}
    </nav>
  );
}
