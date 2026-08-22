"use client";

import type { CategorieGroep } from "@/lib/api";

const PERIODE_PRESETS = [3, 6, 12, 24];

interface FilterBalkProps {
  categorieen: CategorieGroep[];
  winkels: string[];
  categorie: string | null;
  subcategorie: string | null;
  winkel: string | null;
  periodeMaanden: number;
  onCategorieChange: (categorie: string | null) => void;
  onSubcategorieChange: (subcategorie: string | null) => void;
  onWinkelChange: (winkel: string | null) => void;
  onPeriodeChange: (maanden: number) => void;
}

export function FilterBalk({
  categorieen,
  winkels,
  categorie,
  subcategorie,
  winkel,
  periodeMaanden,
  onCategorieChange,
  onSubcategorieChange,
  onWinkelChange,
  onPeriodeChange,
}: FilterBalkProps) {
  const subcategorieen = categorieen.find((g) => g.categorie === categorie)?.subcategorieen ?? [];

  return (
    <div className="flex flex-wrap gap-4">
      <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
        Categorie
        <select
          className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
          value={categorie ?? ""}
          onChange={(e) => onCategorieChange(e.target.value || null)}
        >
          <option value="">Alle</option>
          {categorieen.map((g) => (
            <option key={g.categorie} value={g.categorie}>
              {g.categorie}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
        Subcategorie
        <select
          className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
          value={subcategorie ?? ""}
          onChange={(e) => onSubcategorieChange(e.target.value || null)}
          disabled={!categorie}
        >
          <option value="">Alle</option>
          {subcategorieen.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
        Winkel
        <select
          className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
          value={winkel ?? ""}
          onChange={(e) => onWinkelChange(e.target.value || null)}
        >
          <option value="">Alle</option>
          {winkels.map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
        Periode
        <select
          className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
          value={periodeMaanden}
          onChange={(e) => onPeriodeChange(Number(e.target.value))}
        >
          {PERIODE_PRESETS.map((n) => (
            <option key={n} value={n}>
              Laatste {n} maanden
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
