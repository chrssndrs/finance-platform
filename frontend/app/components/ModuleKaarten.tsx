"use client";

import Link from "next/link";

const bedragFormat = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });

export interface ModuleKaartData {
  titel: string;
  pad: string;
  waarde: number | null;
  waardeLabel?: string;
}

export function ModuleKaarten({ modules }: { modules: ModuleKaartData[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {modules.map((m) => (
        <Link
          key={m.pad}
          href={m.pad}
          className="rounded-lg border border-neutral-200 bg-white p-4 transition-colors hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700 dark:hover:bg-neutral-800/60"
        >
          <div className="text-sm text-neutral-500 dark:text-neutral-400">{m.titel}</div>
          <div className="mt-1 truncate text-lg font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
            {m.waarde !== null ? bedragFormat.format(m.waarde) : "—"}
          </div>
          {m.waardeLabel && <div className="text-xs text-neutral-400">{m.waardeLabel}</div>}
        </Link>
      ))}
    </div>
  );
}
