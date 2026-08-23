"use client";

import { useState } from "react";

import { ApiError, postWaarde, putWaarde, type Waarde, type WaardeInvoer } from "@/lib/api";

const inputKlasse =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-base text-neutral-900 sm:text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100";

interface VastgoedFormulierProps {
  waarde?: Waarde;
  onOpgeslagen: (waarde: Waarde) => void;
  onAnnuleren?: () => void;
}

export function VastgoedFormulier({ waarde, onOpgeslagen, onAnnuleren }: VastgoedFormulierProps) {
  const [datum, setDatum] = useState(waarde?.datum ?? "");
  const [bedrag, setBedrag] = useState(waarde ? String(waarde.waarde).replace(".", ",") : "");
  const [bron, setBron] = useState(waarde?.bron ?? "");
  const [opmerking, setOpmerking] = useState(waarde?.opmerking ?? "");
  const [bezig, setBezig] = useState(false);
  const [foutmelding, setFoutmelding] = useState<string | null>(null);

  async function versturen(e: React.FormEvent) {
    e.preventDefault();
    if (!datum || !bedrag.trim()) {
      setFoutmelding("Datum en waarde zijn verplicht.");
      return;
    }
    setBezig(true);
    setFoutmelding(null);
    const invoer: WaardeInvoer = {
      datum,
      waarde: Number(bedrag.replace(",", ".")),
      bron: bron.trim() || null,
      opmerking: opmerking.trim() || null,
    };
    try {
      const resultaat = waarde ? await putWaarde(waarde.id, invoer) : await postWaarde(invoer);
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
      className="grid grid-cols-1 gap-3 rounded-lg border border-neutral-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4 dark:border-neutral-800 dark:bg-neutral-900"
    >
      <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
        Datum
        <input type="date" required value={datum} onChange={(e) => setDatum(e.target.value)} className={inputKlasse} />
      </label>

      <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
        Waarde
        <input
          type="text"
          inputMode="decimal"
          required
          placeholder="0,00"
          value={bedrag}
          onChange={(e) => setBedrag(e.target.value)}
          className={inputKlasse}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
        Bron (optioneel)
        <input
          type="text"
          placeholder="bijv. WOZ-waardeloket"
          value={bron}
          onChange={(e) => setBron(e.target.value)}
          className={inputKlasse}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
        Opmerking (optioneel)
        <input type="text" value={opmerking} onChange={(e) => setOpmerking(e.target.value)} className={inputKlasse} />
      </label>

      <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
        <button
          type="submit"
          disabled={bezig}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
        >
          {bezig ? "Bezig..." : waarde ? "Opslaan" : "Waarde toevoegen"}
        </button>
        {onAnnuleren && (
          <button
            type="button"
            onClick={onAnnuleren}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
          >
            Annuleren
          </button>
        )}
        {foutmelding && <p className="self-center text-sm text-red-700 dark:text-red-400">{foutmelding}</p>}
      </div>
    </form>
  );
}
