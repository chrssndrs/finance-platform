"use client";

import { useState } from "react";

import { ApiError, putSpaarrekeningDoel, type SpaarRekening, type SparenResponse } from "@/lib/api";

const inputKlasse =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-base text-neutral-900 sm:text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100";

interface SpaarrekeningDoelFormulierProps {
  rekening: SpaarRekening;
  onOpgeslagen: (resultaat: SparenResponse) => void;
  onAnnuleren: () => void;
}

export function SpaarrekeningDoelFormulier({ rekening, onOpgeslagen, onAnnuleren }: SpaarrekeningDoelFormulierProps) {
  const [alias, setAlias] = useState(rekening.alias ?? "");
  const [doelbedrag, setDoelbedrag] = useState(rekening.doelbedrag !== null ? String(rekening.doelbedrag).replace(".", ",") : "");
  const [bezig, setBezig] = useState(false);
  const [foutmelding, setFoutmelding] = useState<string | null>(null);

  async function opslaan(e: React.FormEvent) {
    e.preventDefault();
    const doelGetal = doelbedrag.trim() ? Number(doelbedrag.replace(",", ".")) : null;
    if (doelGetal !== null && (Number.isNaN(doelGetal) || doelGetal <= 0)) {
      setFoutmelding("Spaardoel moet een positief getal zijn.");
      return;
    }
    setBezig(true);
    setFoutmelding(null);
    try {
      const resultaat = await putSpaarrekeningDoel(rekening.rekening, {
        alias: alias.trim() || null,
        doelbedrag: doelGetal,
      });
      onOpgeslagen(resultaat);
    } catch (err) {
      setFoutmelding(err instanceof ApiError ? err.message : "Opslaan mislukt.");
    } finally {
      setBezig(false);
    }
  }

  return (
    <form onSubmit={opslaan} className="flex flex-col gap-3">
      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        {rekening.naam} · <span className="font-mono">{rekening.rekening}</span>
      </p>

      <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
        Alias (optioneel)
        <input
          type="text"
          placeholder={rekening.naam}
          value={alias}
          onChange={(e) => setAlias(e.target.value)}
          className={inputKlasse}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
        Spaardoel (optioneel)
        <input
          type="text"
          inputMode="decimal"
          placeholder="bijv. 10000"
          value={doelbedrag}
          onChange={(e) => setDoelbedrag(e.target.value)}
          className={inputKlasse}
        />
      </label>

      {foutmelding && <p className="text-sm text-red-700 dark:text-red-400">{foutmelding}</p>}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={bezig}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
        >
          {bezig ? "Bezig..." : "Opslaan"}
        </button>
        <button
          type="button"
          onClick={onAnnuleren}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
        >
          Annuleren
        </button>
      </div>
    </form>
  );
}
