"use client";

import { useState } from "react";

import { ApiError, postFactuur, type Factuur } from "@/lib/api";

const inputKlasse =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-base text-neutral-900 sm:text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100";

export function FactuurUploadFormulier({
  onGeupload,
  onAnnuleren,
}: {
  onGeupload: (factuur: Factuur) => void;
  onAnnuleren: () => void;
}) {
  const [bestand, setBestand] = useState<File | null>(null);
  const [bron, setBron] = useState("");
  const [totaalbedrag, setTotaalbedrag] = useState("");
  const [bezig, setBezig] = useState(false);
  const [foutmelding, setFoutmelding] = useState<string | null>(null);

  async function uploaden() {
    if (!bestand) {
      setFoutmelding("Kies een bestand.");
      return;
    }
    if (!bron.trim()) {
      setFoutmelding("Bron is verplicht (bv. 'Bol.com' of 'Creditcard ICS').");
      return;
    }
    setBezig(true);
    setFoutmelding(null);
    try {
      const factuur = await postFactuur(bestand, bron.trim(), totaalbedrag.trim() ? Number(totaalbedrag.replace(",", ".")) : null);
      onGeupload(factuur);
    } catch (err) {
      setFoutmelding(err instanceof ApiError ? err.message : "Uploaden mislukt.");
    } finally {
      setBezig(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
        Bestand
        <input
          type="file"
          onChange={(e) => setBestand(e.target.files?.[0] ?? null)}
          className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-neutral-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-neutral-700 hover:file:bg-neutral-200 dark:file:bg-neutral-800 dark:file:text-neutral-300"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
        Bron
        <input
          type="text"
          placeholder="bijv. Bol.com of Creditcard ICS"
          value={bron}
          onChange={(e) => setBron(e.target.value)}
          className={inputKlasse}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
        Totaalbedrag (optioneel, helpt bij matchen)
        <input
          type="text"
          inputMode="decimal"
          placeholder="0,00"
          value={totaalbedrag}
          onChange={(e) => setTotaalbedrag(e.target.value)}
          className={inputKlasse}
        />
      </label>
      {foutmelding && <p className="text-sm text-red-700 dark:text-red-400">{foutmelding}</p>}
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={bezig}
          onClick={uploaden}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
        >
          {bezig ? "Bezig..." : "Uploaden"}
        </button>
        <button
          type="button"
          onClick={onAnnuleren}
          className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          Annuleren
        </button>
      </div>
    </div>
  );
}
