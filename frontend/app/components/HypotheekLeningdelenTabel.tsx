"use client";

import { useState } from "react";

import { HypotheekFormulier } from "@/app/components/HypotheekFormulier";
import { ApiError, deleteLeningdeel, type Leningdeel } from "@/lib/api";
import { formatteerDatumKort } from "@/lib/periode";

const bedragFormat = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });
const percentageFormat = new Intl.NumberFormat("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 4 });

const TYPE_LABEL: Record<string, string> = {
  annuiteit: "Annuïteit",
  lineair: "Lineair",
  aflossingsvrij: "Aflossingsvrij",
};

interface RijProps {
  leningdeel: Leningdeel;
  onBijgewerkt: (l: Leningdeel) => void;
  onVerwijderd: (id: number) => void;
}

function LeningdeelRij({ leningdeel, onBijgewerkt, onVerwijderd }: RijProps) {
  const [bewerken, setBewerken] = useState(false);
  const [bezig, setBezig] = useState(false);
  const [foutmelding, setFoutmelding] = useState<string | null>(null);

  async function verwijderen() {
    if (!window.confirm(`"${leningdeel.naam}" verwijderen?`)) return;
    setBezig(true);
    try {
      await deleteLeningdeel(leningdeel.id);
      onVerwijderd(leningdeel.id);
    } catch (err) {
      setFoutmelding(err instanceof ApiError ? err.message : "Verwijderen mislukt.");
      setBezig(false);
    }
  }

  if (bewerken) {
    return (
      <tr className="border-b border-neutral-200 dark:border-neutral-800">
        <td colSpan={7} className="py-2">
          <HypotheekFormulier
            leningdeel={leningdeel}
            onOpgeslagen={(l) => {
              onBijgewerkt(l);
              setBewerken(false);
            }}
            onAnnuleren={() => setBewerken(false)}
          />
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-neutral-200 dark:border-neutral-800">
      <td className="py-2 pr-4">
        <div className="text-neutral-900 dark:text-neutral-100">{leningdeel.naam}</div>
        <div className="text-xs text-neutral-400">{TYPE_LABEL[leningdeel.type] ?? leningdeel.type}</div>
      </td>
      <td className="py-2 pr-4 tabular-nums">{bedragFormat.format(leningdeel.hoofdsom)}</td>
      <td className="py-2 pr-4 tabular-nums">{percentageFormat.format(leningdeel.rente_percentage)}%</td>
      <td className="py-2 pr-4 whitespace-nowrap tabular-nums">{formatteerDatumKort(leningdeel.startdatum)}</td>
      <td className="py-2 pr-4 tabular-nums">{leningdeel.looptijd_maanden} mnd</td>
      <td className="py-2 pr-4 tabular-nums font-medium text-neutral-900 dark:text-neutral-100">
        {bedragFormat.format(leningdeel.actuele_schuld)}
      </td>
      <td className="whitespace-nowrap py-2">
        <button
          type="button"
          onClick={() => setBewerken(true)}
          className="mr-2 text-xs text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
        >
          Bewerken
        </button>
        <button
          type="button"
          disabled={bezig}
          onClick={verwijderen}
          className="text-xs text-red-700 hover:text-red-900 disabled:opacity-50 dark:text-red-400 dark:hover:text-red-300"
        >
          Verwijderen
        </button>
        {foutmelding && <p className="mt-1 text-xs text-red-700 dark:text-red-400">{foutmelding}</p>}
      </td>
    </tr>
  );
}

interface HypotheekLeningdelenTabelProps {
  leningdelen: Leningdeel[];
  onBijgewerkt: (l: Leningdeel) => void;
  onVerwijderd: (id: number) => void;
}

export function HypotheekLeningdelenTabel({ leningdelen, onBijgewerkt, onVerwijderd }: HypotheekLeningdelenTabelProps) {
  if (leningdelen.length === 0) {
    return <p className="py-6 text-center text-sm text-neutral-400">Nog geen leningdelen ingevoerd.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-neutral-300 dark:border-neutral-700">
            <th className="py-2 pr-4 font-medium text-neutral-600 dark:text-neutral-400">Leningdeel</th>
            <th className="py-2 pr-4 font-medium text-neutral-600 dark:text-neutral-400">Hoofdsom</th>
            <th className="py-2 pr-4 font-medium text-neutral-600 dark:text-neutral-400">Rente</th>
            <th className="py-2 pr-4 font-medium text-neutral-600 dark:text-neutral-400">Startdatum</th>
            <th className="py-2 pr-4 font-medium text-neutral-600 dark:text-neutral-400">Looptijd</th>
            <th className="py-2 pr-4 font-medium text-neutral-600 dark:text-neutral-400">Actuele schuld</th>
            <th className="py-2 font-medium text-neutral-600 dark:text-neutral-400">Acties</th>
          </tr>
        </thead>
        <tbody>
          {leningdelen.map((l) => (
            <LeningdeelRij key={l.id} leningdeel={l} onBijgewerkt={onBijgewerkt} onVerwijderd={onVerwijderd} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
