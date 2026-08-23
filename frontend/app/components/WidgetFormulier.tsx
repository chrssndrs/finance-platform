"use client";

import { useEffect, useState } from "react";

import { FilterBalk } from "@/app/components/FilterBalk";
import {
  ApiError,
  getAfzenders,
  getCategorieen,
  postWidget,
  putWidget,
  type CategorieGroep,
  type Granulariteit,
  type Widget as WidgetData,
  type WidgetWeergave,
} from "@/lib/api";
import {
  selectieNaarWidgetPeriode,
  widgetPeriodeNaarSelectie,
  STANDAARD_PERIODE_SELECTIE,
  type PeriodeSelectie,
} from "@/lib/periode";

const inputKlasse =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-base text-neutral-900 sm:text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100";

const WEERGAVE_OPTIES: { waarde: WidgetWeergave; label: string }[] = [
  { waarde: "totaal", label: "Totaalbedrag" },
  { waarde: "grafiek", label: "Grafiek" },
  { waarde: "transacties", label: "Transactielijst" },
];

interface WidgetFormulierProps {
  widget?: WidgetData;
  volgendeVolgorde: number;
  onOpgeslagen: (widget: WidgetData) => void;
  onAnnuleren: () => void;
}

export function WidgetFormulier({ widget, volgendeVolgorde, onOpgeslagen, onAnnuleren }: WidgetFormulierProps) {
  const [categorieen, setCategorieen] = useState<CategorieGroep[]>([]);
  const [afzenders, setAfzenders] = useState<string[]>([]);

  const [titel, setTitel] = useState(widget?.titel ?? "");
  const [categorie, setCategorie] = useState<string | null>(widget?.categorie ?? null);
  const [subcategorie, setSubcategorie] = useState<string | null>(widget?.subcategorie ?? null);
  const [afzender, setAfzender] = useState<string | null>(widget?.afzender ?? null);
  const [granulariteit, setGranulariteit] = useState<Granulariteit>(widget?.granulariteit ?? "maand");
  const [periodeSelectie, setPeriodeSelectie] = useState<PeriodeSelectie>(
    widget ? widgetPeriodeNaarSelectie(widget) : STANDAARD_PERIODE_SELECTIE
  );
  const [weergave, setWeergave] = useState<WidgetWeergave>(widget?.weergave ?? "totaal");
  const [bezig, setBezig] = useState(false);
  const [foutmelding, setFoutmelding] = useState<string | null>(null);

  useEffect(() => {
    getCategorieen()
      .then((res) => setCategorieen(res.categorieen))
      .catch(() => {});
  }, []);

  useEffect(() => {
    getAfzenders({ categorie, subcategorie })
      .then((res) => setAfzenders(res.afzenders))
      .catch(() => {});
  }, [categorie, subcategorie]);

  async function versturen(e: React.FormEvent) {
    e.preventDefault();
    setBezig(true);
    setFoutmelding(null);
    const invoer = {
      titel: titel.trim() || null,
      categorie,
      subcategorie,
      afzender,
      granulariteit,
      weergave,
      volgorde: widget?.volgorde ?? volgendeVolgorde,
      ...selectieNaarWidgetPeriode(periodeSelectie),
    };
    try {
      const resultaat = widget ? await putWidget(widget.id, invoer) : await postWidget(invoer);
      onOpgeslagen(resultaat);
    } catch (err) {
      setFoutmelding(err instanceof ApiError ? err.message : "Opslaan mislukt.");
    } finally {
      setBezig(false);
    }
  }

  return (
    <form
      onSubmit={versturen}
      className="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
    >
      <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
        Titel (optioneel)
        <input
          type="text"
          placeholder="bijv. Boodschappen"
          value={titel}
          onChange={(e) => setTitel(e.target.value)}
          className={inputKlasse}
        />
      </label>

      <FilterBalk
        categorieen={categorieen}
        afzenders={afzenders}
        categorie={categorie}
        subcategorie={subcategorie}
        afzender={afzender}
        granulariteit={granulariteit}
        periodeSelectie={periodeSelectie}
        onCategorieChange={(c) => {
          setCategorie(c);
          setSubcategorie(null);
        }}
        onSubcategorieChange={setSubcategorie}
        onAfzenderChange={setAfzender}
        onGranulariteitChange={setGranulariteit}
        onPeriodeSelectieChange={setPeriodeSelectie}
        onReset={() => {
          setCategorie(null);
          setSubcategorie(null);
          setAfzender(null);
          setPeriodeSelectie(STANDAARD_PERIODE_SELECTIE);
        }}
      />

      <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
        Widget-weergave
        <select value={weergave} onChange={(e) => setWeergave(e.target.value as WidgetWeergave)} className={inputKlasse}>
          {WEERGAVE_OPTIES.map((o) => (
            <option key={o.waarde} value={o.waarde}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={bezig}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
        >
          {bezig ? "Bezig..." : widget ? "Opslaan" : "Widget toevoegen"}
        </button>
        <button
          type="button"
          onClick={onAnnuleren}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
        >
          Annuleren
        </button>
        {foutmelding && <p className="self-center text-sm text-red-700 dark:text-red-400">{foutmelding}</p>}
      </div>
    </form>
  );
}
