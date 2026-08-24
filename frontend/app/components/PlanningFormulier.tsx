"use client";

import { useState } from "react";

import { ApiError, deletePlanningItem, postPlanningItem, putPlanningItem, type PlanningItem } from "@/lib/api";

const inputKlasse =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-base text-neutral-900 sm:text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100";

type Type = "uitgave" | "inkomst";

interface PlanningFormulierProps {
  item?: PlanningItem;
  onOpgeslagen: (item: PlanningItem) => void;
  onAnnuleren: () => void;
  onVerwijderd?: (id: number) => void;
}

export function PlanningFormulier({ item, onOpgeslagen, onAnnuleren, onVerwijderd }: PlanningFormulierProps) {
  const [omschrijving, setOmschrijving] = useState(item?.omschrijving ?? "");
  const [type, setType] = useState<Type>(item && item.bedrag > 0 ? "inkomst" : "uitgave");
  const [bedrag, setBedrag] = useState(item ? String(Math.abs(item.bedrag)) : "");
  const [datum, setDatum] = useState(item?.datum ?? "");
  const [bezig, setBezig] = useState(false);
  const [bezigMetVerwijderen, setBezigMetVerwijderen] = useState(false);
  const [foutmelding, setFoutmelding] = useState<string | null>(null);

  async function versturen(e: React.FormEvent) {
    e.preventDefault();
    if (!omschrijving.trim()) {
      setFoutmelding("Omschrijving is verplicht.");
      return;
    }
    const bedragGetal = Number(bedrag.replace(",", "."));
    if (!bedrag.trim() || Number.isNaN(bedragGetal) || bedragGetal <= 0) {
      setFoutmelding("Bedrag moet een positief getal zijn.");
      return;
    }
    if (!datum) {
      setFoutmelding("Datum is verplicht.");
      return;
    }
    setBezig(true);
    setFoutmelding(null);
    try {
      const invoer = {
        omschrijving: omschrijving.trim(),
        bedrag: type === "inkomst" ? bedragGetal : -bedragGetal,
        datum,
      };
      const resultaat =
        item && item.id !== null ? await putPlanningItem(item.id, invoer) : await postPlanningItem(invoer);
      onOpgeslagen(resultaat);
    } catch (err) {
      setFoutmelding(err instanceof ApiError ? err.message : "Opslaan mislukt.");
    } finally {
      setBezig(false);
    }
  }

  async function verwijderen() {
    if (!item || item.id === null || !onVerwijderd) return;
    if (!window.confirm(`Post "${item.omschrijving}" verwijderen?`)) return;
    setBezigMetVerwijderen(true);
    try {
      await deletePlanningItem(item.id);
      onVerwijderd(item.id);
    } catch (err) {
      setFoutmelding(err instanceof ApiError ? err.message : "Verwijderen mislukt.");
      setBezigMetVerwijderen(false);
    }
  }

  return (
    <form onSubmit={versturen} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
        Omschrijving
        <input
          type="text"
          placeholder="bijv. Belastingteruggave"
          value={omschrijving}
          onChange={(e) => setOmschrijving(e.target.value)}
          className={inputKlasse}
        />
      </label>

      <div className="flex flex-wrap gap-4">
        <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
          Type
          <select value={type} onChange={(e) => setType(e.target.value as Type)} className={inputKlasse}>
            <option value="uitgave">Uitgave</option>
            <option value="inkomst">Inkomst</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
          Bedrag
          <input
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            value={bedrag}
            onChange={(e) => setBedrag(e.target.value)}
            className={inputKlasse}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
          Datum
          <input type="date" value={datum} onChange={(e) => setDatum(e.target.value)} className={inputKlasse} />
        </label>
      </div>

      {foutmelding && <p className="text-sm text-red-700 dark:text-red-400">{foutmelding}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={bezig}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
        >
          {bezig ? "Bezig..." : "Opslaan"}
        </button>
        <button
          type="button"
          onClick={onAnnuleren}
          className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          Annuleren
        </button>
        {item && item.id !== null && onVerwijderd && (
          <button
            type="button"
            disabled={bezigMetVerwijderen}
            onClick={verwijderen}
            className="ml-auto text-sm text-red-700 hover:text-red-900 disabled:opacity-50 dark:text-red-400 dark:hover:text-red-300"
          >
            Verwijderen
          </button>
        )}
      </div>
    </form>
  );
}
