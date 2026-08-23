"use client";

import { useState } from "react";

import { Combobox } from "@/app/components/Combobox";
import { ApiError, postInboedelArtikel, type InboedelArtikel } from "@/lib/api";

interface InboedelFormulierProps {
  merken: string[];
  winkels: string[];
  onToegevoegd: (artikel: InboedelArtikel) => void;
}

const inputKlasse =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-base text-neutral-900 sm:text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100";

export function InboedelFormulier({ merken, winkels, onToegevoegd }: InboedelFormulierProps) {
  const [omschrijving, setOmschrijving] = useState("");
  const [merk, setMerk] = useState<string | null>(null);
  const [model, setModel] = useState("");
  const [winkel, setWinkel] = useState<string | null>(null);
  const [bedrag, setBedrag] = useState("");
  const [datum, setDatum] = useState("");
  const [levensduur, setLevensduur] = useState("60");
  const [bezig, setBezig] = useState(false);
  const [foutmelding, setFoutmelding] = useState<string | null>(null);

  function reset() {
    setOmschrijving("");
    setMerk(null);
    setModel("");
    setWinkel(null);
    setBedrag("");
    setDatum("");
    setLevensduur("60");
  }

  async function versturen(e: React.FormEvent) {
    e.preventDefault();
    if (!omschrijving.trim()) {
      setFoutmelding("Omschrijving is verplicht.");
      return;
    }
    setBezig(true);
    setFoutmelding(null);
    try {
      const artikel = await postInboedelArtikel({
        omschrijving: omschrijving.trim(),
        merk,
        model: model.trim() || null,
        winkel,
        bedrag: bedrag.trim() ? Number(bedrag.replace(",", ".")) : null,
        datum: datum || null,
        levensduur_maanden: levensduur.trim() ? Number(levensduur) : null,
      });
      onToegevoegd(artikel);
      reset();
    } catch (err) {
      setFoutmelding(err instanceof ApiError ? err.message : "Kon artikel niet toevoegen.");
    } finally {
      setBezig(false);
    }
  }

  return (
    <form
      onSubmit={versturen}
      className="grid grid-cols-1 gap-3 rounded-lg border border-neutral-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4 dark:border-neutral-800 dark:bg-neutral-900"
    >
      <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400 lg:col-span-2">
        Omschrijving
        <input
          type="text"
          required
          value={omschrijving}
          onChange={(e) => setOmschrijving(e.target.value)}
          className={inputKlasse}
        />
      </label>

      <Combobox label="Merk" opties={merken} waarde={merk} onChange={setMerk} vrijeInvoer placeholder="Kies of typ" />

      <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
        Model
        <input type="text" value={model} onChange={(e) => setModel(e.target.value)} className={inputKlasse} />
      </label>

      <Combobox
        label="Winkel"
        opties={winkels}
        waarde={winkel}
        onChange={setWinkel}
        vrijeInvoer
        placeholder="Kies of typ"
      />

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

      <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
        Levensduur (maanden)
        <input
          type="number"
          min={1}
          value={levensduur}
          onChange={(e) => setLevensduur(e.target.value)}
          className={inputKlasse}
        />
      </label>

      <div className="flex items-end lg:col-span-4">
        <button
          type="submit"
          disabled={bezig}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
        >
          {bezig ? "Bezig..." : "Artikel toevoegen"}
        </button>
        {foutmelding && <p className="ml-3 self-center text-sm text-red-700 dark:text-red-400">{foutmelding}</p>}
      </div>
    </form>
  );
}
