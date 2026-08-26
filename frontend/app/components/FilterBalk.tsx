"use client";

import { DatumRangeKiezer } from "@/app/components/DatumRangeKiezer";
import { MultiCombobox } from "@/app/components/MultiCombobox";
import type { SerieKey } from "@/app/components/TotalenChart";
import type { CategorieGroep, Granulariteit } from "@/lib/api";
import type { PeriodeSelectie } from "@/lib/periode";

const GRANULARITEIT_LABEL: Record<Granulariteit, string> = {
  dag: "Dag",
  week: "Week",
  maand: "Maand",
  jaar: "Jaar",
};

// Alleen de 2 echte series zijn hier zichtbaar te maken — de "verwacht"-
// lagen horen niet bij deze (historische) pagina.
const SERIE_LABEL: Partial<Record<SerieKey, string>> = {
  inkomsten: "Inkomsten",
  uitgaven: "Uitgaven",
};

interface FilterBalkProps {
  categorieen: CategorieGroep[];
  afzenders: string[];
  categorie: string | null;
  subcategorie: string | null;
  geselecteerdeAfzenders: string[];
  granulariteit: Granulariteit;
  periodeSelectie: PeriodeSelectie;
  onCategorieChange: (categorie: string | null) => void;
  onSubcategorieChange: (subcategorie: string | null) => void;
  onAfzendersChange: (afzenders: string[]) => void;
  onGranulariteitChange: (granulariteit: Granulariteit) => void;
  onPeriodeSelectieChange: (selectie: PeriodeSelectie) => void;
  onReset: () => void;
  zichtbareSeries?: Record<SerieKey, boolean>;
  onZichtbareSeriesChange?: (series: Record<SerieKey, boolean>) => void;
  verbergEigenRekeningen?: boolean;
  onVerbergEigenRekeningenChange?: (waarde: boolean) => void;
}

export function FilterBalk({
  categorieen,
  afzenders,
  categorie,
  subcategorie,
  geselecteerdeAfzenders,
  granulariteit,
  periodeSelectie,
  onCategorieChange,
  onSubcategorieChange,
  onAfzendersChange,
  onGranulariteitChange,
  onPeriodeSelectieChange,
  onReset,
  zichtbareSeries,
  onZichtbareSeriesChange,
  verbergEigenRekeningen,
  onVerbergEigenRekeningenChange,
}: FilterBalkProps) {
  const subcategorieen = categorieen.find((g) => g.categorie === categorie)?.subcategorieen ?? [];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-4">
      <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
        Categorie
        <select
          className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-base text-neutral-900 sm:text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
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
          className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-base text-neutral-900 disabled:opacity-50 disabled:pointer-events-none sm:text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
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

      <MultiCombobox
        label="Winkel / afzender"
        opties={afzenders}
        waarden={geselecteerdeAfzenders}
        onChange={onAfzendersChange}
      />

      <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
        Weergave
        <select
          className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-base text-neutral-900 sm:text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
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

      <div className="flex flex-col gap-1">
        <span className="invisible text-sm">Reset</span>
        <button
          type="button"
          onClick={onReset}
          className="rounded-md border border-neutral-300 px-3 py-2 text-base text-neutral-600 hover:bg-neutral-100 sm:text-sm dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
        >
          Filters wissen
        </button>
        </div>
      </div>

      {(zichtbareSeries && onZichtbareSeriesChange) || onVerbergEigenRekeningenChange ? (
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {zichtbareSeries &&
            onZichtbareSeriesChange &&
            (Object.keys(SERIE_LABEL) as SerieKey[]).map((serie) => (
              <label key={serie} className="flex items-center gap-1.5 text-sm text-neutral-600 dark:text-neutral-400">
                <input
                  type="checkbox"
                  checked={zichtbareSeries[serie]}
                  onChange={(e) =>
                    onZichtbareSeriesChange({ ...zichtbareSeries, [serie]: e.target.checked })
                  }
                />
                {SERIE_LABEL[serie]}
              </label>
            ))}
          {onVerbergEigenRekeningenChange && (
            <label className="flex items-center gap-1.5 text-sm text-neutral-600 dark:text-neutral-400">
              <input
                type="checkbox"
                checked={verbergEigenRekeningen ?? false}
                onChange={(e) => onVerbergEigenRekeningenChange(e.target.checked)}
              />
              Overboekingen naar eigen rekeningen verbergen
            </label>
          )}
        </div>
      ) : null}
    </div>
  );
}
