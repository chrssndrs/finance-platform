"use client";

import { useState } from "react";

import { Combobox } from "@/app/components/Combobox";
import {
  ApiError,
  deleteInboedelArtikel,
  postInboedelArtikel,
  putInboedelArtikel,
  type InboedelArtikel,
} from "@/lib/api";

interface InboedelFormulierProps {
  artikel?: InboedelArtikel;
  merken: string[];
  winkels: string[];
  onOpgeslagen: (artikel: InboedelArtikel) => void;
  onAnnuleren: () => void;
  onVerwijderd?: (id: number) => void;
}

const inputKlasse =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-base text-neutral-900 sm:text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100";

export function InboedelFormulier({
  artikel,
  merken,
  winkels,
  onOpgeslagen,
  onAnnuleren,
  onVerwijderd,
}: InboedelFormulierProps) {
  const [omschrijving, setOmschrijving] = useState(artikel?.omschrijving ?? "");
  const [merk, setMerk] = useState<string | null>(artikel?.merk ?? null);
  const [model, setModel] = useState(artikel?.model ?? "");
  const [winkel, setWinkel] = useState<string | null>(artikel?.winkel ?? null);
  const [bedrag, setBedrag] = useState(artikel?.bedrag !== null && artikel?.bedrag !== undefined ? String(artikel.bedrag) : "");
  const [datum, setDatum] = useState(artikel?.datum ?? "");
  const [levensduur, setLevensduur] = useState(
    artikel?.levensduur_maanden !== null && artikel?.levensduur_maanden !== undefined ? String(artikel.levensduur_maanden) : "60"
  );
  const [serienummer, setSerienummer] = useState(artikel?.serienummer ?? "");
  const [wordtVervangen, setWordtVervangen] = useState(artikel?.wordt_vervangen ?? true);
  const [bezig, setBezig] = useState(false);
  const [bezigMetVerwijderen, setBezigMetVerwijderen] = useState(false);
  const [foutmelding, setFoutmelding] = useState<string | null>(null);

  async function versturen(e: React.FormEvent) {
    e.preventDefault();
    if (!omschrijving.trim()) {
      setFoutmelding("Omschrijving is verplicht.");
      return;
    }
    setBezig(true);
    setFoutmelding(null);
    try {
      const invoer = {
        omschrijving: omschrijving.trim(),
        merk,
        model: model.trim() || null,
        winkel,
        bedrag: bedrag.trim() ? Number(bedrag.replace(",", ".")) : null,
        datum: datum || null,
        levensduur_maanden: levensduur.trim() ? Number(levensduur) : null,
        serienummer: serienummer.trim() || null,
        wordt_vervangen: wordtVervangen,
      };
      const resultaat = artikel ? await putInboedelArtikel(artikel.id, invoer) : await postInboedelArtikel(invoer);
      onOpgeslagen(resultaat);
    } catch (err) {
      setFoutmelding(err instanceof ApiError ? err.message : "Opslaan mislukt.");
    } finally {
      setBezig(false);
    }
  }

  async function verwijderen() {
    if (!artikel || !onVerwijderd) return;
    if (!window.confirm(`"${artikel.omschrijving}" verwijderen?`)) return;
    setBezigMetVerwijderen(true);
    try {
      await deleteInboedelArtikel(artikel.id);
      onVerwijderd(artikel.id);
    } catch (err) {
      setFoutmelding(err instanceof ApiError ? err.message : "Verwijderen mislukt.");
      setBezigMetVerwijderen(false);
    }
  }

  return (
    <form onSubmit={versturen} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400 sm:col-span-2">
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

      <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
        Serienummer
        <input
          type="text"
          value={serienummer}
          onChange={(e) => setSerienummer(e.target.value)}
          className={inputKlasse}
        />
      </label>

      <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 sm:col-span-2">
        <input type="checkbox" checked={wordtVervangen} onChange={(e) => setWordtVervangen(e.target.checked)} />
        Wordt vervangen bij einde levensduur
      </label>

      {foutmelding && <p className="text-sm text-red-700 dark:text-red-400 sm:col-span-2">{foutmelding}</p>}

      <div className="flex items-center gap-3 sm:col-span-2">
        <button
          type="submit"
          disabled={bezig}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
        >
          {bezig ? "Bezig..." : artikel ? "Opslaan" : "Artikel toevoegen"}
        </button>
        <button
          type="button"
          onClick={onAnnuleren}
          className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          Annuleren
        </button>
        {artikel && onVerwijderd && (
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
