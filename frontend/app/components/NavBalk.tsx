"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ThemeToggle } from "@/app/components/ThemeToggle";

const DOMEINEN = [
  { pad: "/uitgaven", label: "Uitgaven" },
  { pad: "/inboedel", label: "Inboedel" },
  { pad: "/abonnementen", label: "Abonnementen" },
  { pad: "/beleggingen", label: "Beleggingen" },
];

export function NavBalk() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-neutral-200 dark:border-neutral-800">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-6">
        <div className="flex gap-1">
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
    </nav>
  );
}
