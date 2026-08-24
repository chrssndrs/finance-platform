"use client";

import { useState } from "react";

import {
  ApiError,
  deleteLeningdeel,
  postLeningdeel,
  putLeningdeel,
  type HypotheekType,
  type Leningdeel,
  type LeningdeelInvoer,
} from "@/lib/api";

const inputKlasse =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-base text-neutral-900 sm:text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100";

const TYPE_OPTIES: { waarde: HypotheekType; label: string }[] = [
  { waarde: "annuiteit", label: "Annuïteit" },
  { waarde: "lineair", label: "Lineair" },
  { waarde: "aflossingsvrij", label: "Aflossingsvrij" },
];

interface HypotheekFormulierProps {
  leningdeel?: Leningdeel;
  onOpgeslagen: (leningdeel: Leningdeel) => void;
  onAnnuleren?: () => void;
  onVerwijderd?: (id: number) => void;
}

export function HypotheekFormulier({ leningdeel, onOpgeslagen, onAnnuleren, onVerwijderd }: HypotheekFormulierProps) {
  const [naam, setNaam] = useState(leningdeel?.naam ?? "");
  const [type, setType] = useState<HypotheekType>(leningdeel?.type ?? "annuiteit");
  const [hoofdsom, setHoofdsom] = useState(leningdeel ? String(leningdeel.hoofdsom).replace(".", ",") : "");
  const [rente, setRente] = useState(leningdeel ? String(leningdeel.rente_percentage).replace(".", ",") : "");
  const [startdatum, setStartdatum] = useState(leningdeel?.startdatum ?? "");
  const [looptijd, setLooptijd] = useState(leningdeel ? String(leningdeel.looptijd_maanden) : "360");
  const [rentevastTot, setRentevastTot] = useState(leningdeel?.rentevast_tot ?? "");
  const [bezig, setBezig] = useState(false);
  const [bezigMetVerwijderen, setBezigMetVerwijderen] = useState(false);
  const [foutmelding, setFoutmelding] = useState<string | null>(null);

  async function versturen(e: React.FormEvent) {
    e.preventDefault();
    if (!naam.trim() || !hoofdsom.trim() || !startdatum || !looptijd.trim()) {
      setFoutmelding("Naam, hoofdsom, startdatum en looptijd zijn verplicht.");
      return;
    }
    setBezig(true);
    setFoutmelding(null);
    const invoer: LeningdeelInvoer = {
      naam: naam.trim(),
      type,
      hoofdsom: Number(hoofdsom.replace(",", ".")),
      rente_percentage: Number((rente || "0").replace(",", ".")),
      startdatum,
      looptijd_maanden: Number(looptijd),
      rentevast_tot: rentevastTot || null,
    };
    try {
      const resultaat = leningdeel ? await putLeningdeel(leningdeel.id, invoer) : await postLeningdeel(invoer);
      onOpgeslagen(resultaat);
    } catch (err) {
      setFoutmelding(err instanceof ApiError ? err.message : "Opslaan mislukt.");
    } finally {
      setBezig(false);
    }
  }

  async function verwijderen() {
    if (!leningdeel || !onVerwijderd) return;
    if (!window.confirm(`"${leningdeel.naam}" verwijderen?`)) return;
    setBezigMetVerwijderen(true);
    try {
      await deleteLeningdeel(leningdeel.id);
      onVerwijderd(leningdeel.id);
    } catch (err) {
      setFoutmelding(err instanceof ApiError ? err.message : "Verwijderen mislukt.");
      setBezigMetVerwijderen(false);
    }
  }

  return (
    <form onSubmit={versturen} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
        Naam
        <input
          type="text"
          required
          placeholder="bijv. Leningdeel 1"
          value={naam}
          onChange={(e) => setNaam(e.target.value)}
          className={inputKlasse}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
        Type
        <select value={type} onChange={(e) => setType(e.target.value as HypotheekType)} className={inputKlasse}>
          {TYPE_OPTIES.map((o) => (
            <option key={o.waarde} value={o.waarde}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
        Hoofdsom
        <input
          type="text"
          inputMode="decimal"
          required
          placeholder="0,00"
          value={hoofdsom}
          onChange={(e) => setHoofdsom(e.target.value)}
          className={inputKlasse}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
        Rente (% per jaar)
        <input
          type="text"
          inputMode="decimal"
          placeholder="3,50"
          value={rente}
          onChange={(e) => setRente(e.target.value)}
          className={inputKlasse}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
        Startdatum
        <input
          type="date"
          required
          value={startdatum}
          onChange={(e) => setStartdatum(e.target.value)}
          className={inputKlasse}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
        Looptijd (maanden)
        <input
          type="number"
          required
          min={1}
          placeholder="360 voor 30 jaar"
          value={looptijd}
          onChange={(e) => setLooptijd(e.target.value)}
          className={inputKlasse}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
        Rentevast tot (optioneel)
        <input
          type="date"
          value={rentevastTot}
          onChange={(e) => setRentevastTot(e.target.value)}
          className={inputKlasse}
        />
      </label>

      {foutmelding && <p className="text-sm text-red-700 dark:text-red-400 sm:col-span-2">{foutmelding}</p>}

      <div className="flex items-center gap-2 sm:col-span-2">
        <button
          type="submit"
          disabled={bezig}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
        >
          {bezig ? "Bezig..." : leningdeel ? "Opslaan" : "Leningdeel toevoegen"}
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
        {leningdeel && onVerwijderd && (
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
