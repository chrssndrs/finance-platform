"use client";

import { Combobox } from "@/app/components/Combobox";
import { DatumRangeKiezer } from "@/app/components/DatumRangeKiezer";
import type { CategorieGroep, Granulariteit } from "@/lib/api";
import type { PeriodeSelectie } from "@/lib/periode";

const GRANULARITEIT_LABEL: Record<Granulariteit, string> = {
  dag: "Dag",
  week: "Week",
  maand: "Maand",
  jaar: "Jaar",
};

interface FilterBalkProps {
  categorieen: CategorieGroep[];
  afzenders: string[];
  categorie: string | null;
  subcategorie: string | null;
  afzender: string | null;
  granulariteit: Granulariteit;
  periodeSelectie: PeriodeSelectie;
  onCategorieChange: (categorie: string | null) => void;
  onSubcategorieChange: (subcategorie: string | null) => void;
  onAfzenderChange: (afzender: string | null) => void;
  onGranulariteitChange: (granulariteit: Granulariteit) => void;
  onPeriodeSelectieChange: (selectie: PeriodeSelectie) => void;
}

export function FilterBalk({
  categorieen,
  afzenders,
  categorie,
  subcategorie,
  afzender,
  granulariteit,
  periodeSelectie,
  onCategorieChange,
  onSubcategorieChange,
  onAfzenderChange,
  onGranulariteitChange,
  onPeriodeSelectieChange,
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

      <Combobox label="Winkel / afzender" opties={afzenders} waarde={afzender} onChange={onAfzenderChange} />

      <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
        Weergave
        <select
          className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
          value={granulariteit}
          onChange={(e) => onGranulariteitChange(e.target.value as Granulariteit)}
        >
          {(Object.keys(GRANULARITEIT_LABEL) as Granulariteit[]).map((g) => (
            <option key={g} value={g}>
              {GRANULARITEIT_LABEL[g]}
            </option>
          ))}
        </select>
      </label>

      <DatumRangeKiezer selectie={periodeSelectie} onChange={onPeriodeSelectieChange} />
    </div>
  );
}
