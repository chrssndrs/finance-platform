"use client";

import { useState } from "react";

import { ContantGeldCoupureLijst } from "@/app/components/ContantGeldCoupureLijst";
import { ApiError, postContantGeldVerplaatsen, type ContantGeldResponse } from "@/lib/api";

const inputKlasse =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-base text-neutral-900 sm:text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100";

export function VerplaatsFormulier({
  data,
  onOpgeslagen,
  onAnnuleren,
}: {
  data: ContantGeldResponse;
  onOpgeslagen: (data: ContantGeldResponse) => void;
  onAnnuleren: () => void;
}) {
  const [vanId, setVanId] = useState<number>(data.locaties[0]?.id ?? 0);
  const [naarId, setNaarId] = useState<number>(data.locaties[1]?.id ?? data.locaties[0]?.id ?? 0);
  const [datum, setDatum] = useState(new Date().toISOString().slice(0, 10));
  const [omschrijving, setOmschrijving] = useState("");
  const [aantallen, setAantallen] = useState<Record<number, number>>({});
  const [bezig, setBezig] = useState(false);
  const [foutmelding, setFoutmelding] = useState<string | null>(null);

  const vanLocatie = data.locaties.find((l) => l.id === vanId);
  const beschikbaar: Record<number, number> = {};
  vanLocatie?.tellingen.forEach((t) => (beschikbaar[t.coupure] = t.aantal));

  async function versturen(e: React.FormEvent) {
    e.preventDefault();
    if (vanId === naarId) {
      setFoutmelding("Bron- en doellocatie moeten verschillen.");
      return;
    }
    const regels = Object.entries(aantallen)
      .map(([coupure, aantal]) => ({ coupure: Number(coupure), aantal }))
      .filter((r) => r.aantal > 0);
    if (regels.length === 0) {
      setFoutmelding("Geef aan hoeveel van welke coupure je verplaatst.");
      return;
    }
    setBezig(true);
    setFoutmelding(null);
    try {
      const resultaat = await postContantGeldVerplaatsen({
        van_locatie_id: vanId,
        naar_locatie_id: naarId,
        datum,
        omschrijving: omschrijving.trim() || null,
        regels,
      });
      onOpgeslagen(resultaat);
    } catch (err) {
      setFoutmelding(err instanceof ApiError ? err.message : "Verplaatsen mislukt.");
    } finally {
      setBezig(false);
    }
  }

  return (
    <form onSubmit={versturen} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
          Van
          <select
            value={vanId}
            onChange={(e) => {
              setVanId(Number(e.target.value));
              setAantallen({});
            }}
            className={inputKlasse}
          >
            {data.locaties.map((l) => (
              <option key={l.id} value={l.id}>
                {l.naam}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
          Naar
          <select value={naarId} onChange={(e) => setNaarId(Number(e.target.value))} className={inputKlasse}>
            {data.locaties.map((l) => (
              <option key={l.id} value={l.id}>
                {l.naam}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
        Datum
        <input type="date" required value={datum} onChange={(e) => setDatum(e.target.value)} className={inputKlasse} />
      </label>

      <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
        Omschrijving (optioneel)
        <input
          type="text"
          placeholder="bijv. Contant pinnen voor onderweg"
          value={omschrijving}
          onChange={(e) => setOmschrijving(e.target.value)}
          className={inputKlasse}
        />
      </label>

      <ContantGeldCoupureLijst
        coupures={data.coupures}
        beschikbaar={beschikbaar}
        waarden={aantallen}
        onChange={(coupure, aantal) => setAantallen((huidig) => ({ ...huidig, [coupure]: aantal }))}
      />

      {foutmelding && <p className="text-sm text-red-700 dark:text-red-400">{foutmelding}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={bezig}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
        >
          {bezig ? "Bezig..." : "Verplaatsen"}
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
