"use client";

import { useMemo, useState } from "react";

import { ApiError, deleteWaarde, putWaarde, type Waarde, type WaardeInvoer } from "@/lib/api";
import { formatteerDatumKort } from "@/lib/periode";

const bedragFormat = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });

type SortKey = "datum" | "waarde" | "bron" | "opmerking";

const KOLOMMEN: { key: SortKey; label: string }[] = [
  { key: "datum", label: "Datum" },
  { key: "waarde", label: "Waarde" },
  { key: "bron", label: "Bron" },
  { key: "opmerking", label: "Opmerking" },
];

function naarInvoer(w: Waarde): WaardeInvoer {
  return { datum: w.datum, waarde: w.waarde, bron: w.bron, opmerking: w.opmerking };
}

const inputKlasse =
  "w-full min-w-[7rem] rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100";

interface VastgoedRijProps {
  waarde: Waarde;
  onBijgewerkt: (waarde: Waarde) => void;
  onVerwijderd: (id: number) => void;
}

function VastgoedRij({ waarde, onBijgewerkt, onVerwijderd }: VastgoedRijProps) {
  const [bewerken, setBewerken] = useState(false);
  const [invoer, setInvoer] = useState<WaardeInvoer>(() => naarInvoer(waarde));
  const [bezig, setBezig] = useState(false);
  const [foutmelding, setFoutmelding] = useState<string | null>(null);

  function startBewerken() {
    setInvoer(naarInvoer(waarde));
    setFoutmelding(null);
    setBewerken(true);
  }

  async function opslaan() {
    if (!invoer.datum || !invoer.waarde) {
      setFoutmelding("Datum en waarde zijn verplicht.");
      return;
    }
    setBezig(true);
    setFoutmelding(null);
    try {
      const bijgewerkt = await putWaarde(waarde.id, invoer);
      onBijgewerkt(bijgewerkt);
      setBewerken(false);
    } catch (err) {
      setFoutmelding(err instanceof ApiError ? err.message : "Opslaan mislukt.");
    } finally {
      setBezig(false);
    }
  }

  async function verwijderen() {
    if (!window.confirm(`Waarde van ${formatteerDatumKort(waarde.datum)} verwijderen?`)) return;
    setBezig(true);
    try {
      await deleteWaarde(waarde.id);
      onVerwijderd(waarde.id);
    } catch (err) {
      setFoutmelding(err instanceof ApiError ? err.message : "Verwijderen mislukt.");
      setBezig(false);
    }
  }

  if (bewerken) {
    return (
      <tr className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/60">
        <td className="py-2 pr-2 align-top">
          <input
            type="date"
            value={invoer.datum}
            onChange={(e) => setInvoer({ ...invoer, datum: e.target.value })}
            className={inputKlasse}
          />
          {foutmelding && <p className="mt-1 text-xs text-red-700 dark:text-red-400">{foutmelding}</p>}
        </td>
        <td className="py-2 pr-2 align-top">
          <input
            type="text"
            inputMode="decimal"
            value={invoer.waarde}
            onChange={(e) => setInvoer({ ...invoer, waarde: Number(e.target.value.replace(",", ".")) || 0 })}
            className={inputKlasse}
          />
        </td>
        <td className="py-2 pr-2 align-top">
          <input
            type="text"
            value={invoer.bron ?? ""}
            onChange={(e) => setInvoer({ ...invoer, bron: e.target.value || null })}
            className={inputKlasse}
          />
        </td>
        <td className="py-2 pr-2 align-top">
          <input
            type="text"
            value={invoer.opmerking ?? ""}
            onChange={(e) => setInvoer({ ...invoer, opmerking: e.target.value || null })}
            className={inputKlasse}
          />
        </td>
        <td className="py-2 align-top whitespace-nowrap">
          <button
            type="button"
            disabled={bezig}
            onClick={opslaan}
            className="mr-1 rounded-md bg-neutral-900 px-2 py-1 text-xs font-medium text-white hover:bg-neutral-700 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
          >
            Opslaan
          </button>
          <button
            type="button"
            disabled={bezig}
            onClick={() => setBewerken(false)}
            className="rounded-md border border-neutral-300 px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
          >
            Annuleren
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-neutral-200 dark:border-neutral-800">
      <td className="py-2 pr-4 whitespace-nowrap tabular-nums">{formatteerDatumKort(waarde.datum)}</td>
      <td className="py-2 pr-4 tabular-nums">{bedragFormat.format(waarde.waarde)}</td>
      <td className="py-2 pr-4 text-neutral-600 dark:text-neutral-400">{waarde.bron ?? "—"}</td>
      <td className="py-2 pr-4 text-neutral-600 dark:text-neutral-400">{waarde.opmerking ?? "—"}</td>
      <td className="whitespace-nowrap py-2">
        <button
          type="button"
          onClick={startBewerken}
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
        {foutmelding && !bewerken && <p className="mt-1 text-xs text-red-700 dark:text-red-400">{foutmelding}</p>}
      </td>
    </tr>
  );
}

interface VastgoedTabelProps {
  waardes: Waarde[];
  onBijgewerkt: (waarde: Waarde) => void;
  onVerwijderd: (id: number) => void;
}

export function VastgoedTabel({ waardes, onBijgewerkt, onVerwijderd }: VastgoedTabelProps) {
  const [sortKey, setSortKey] = useState<SortKey>("datum");
  const [aflopend, setAflopend] = useState(true);

  const gesorteerd = useMemo(() => {
    const kopie = [...waardes];
    kopie.sort((a, b) => {
      const va = a[sortKey] ?? "";
      const vb = b[sortKey] ?? "";
      const vergelijking = typeof va === "string" ? va.localeCompare(vb as string) : (va as number) - (vb as number);
      return aflopend ? -vergelijking : vergelijking;
    });
    return kopie;
  }, [waardes, sortKey, aflopend]);

  function klikKolom(key: SortKey) {
    if (key === sortKey) {
      setAflopend((v) => !v);
    } else {
      setSortKey(key);
      setAflopend(false);
    }
  }

  if (waardes.length === 0) {
    return <p className="py-6 text-center text-sm text-neutral-400">Nog geen waardes ingevoerd.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] text-left text-sm">
        <thead>
          <tr className="border-b border-neutral-300 dark:border-neutral-700">
            {KOLOMMEN.map((k) => (
              <th key={k.key} className="whitespace-nowrap py-2 pr-4 font-medium text-neutral-600 dark:text-neutral-400">
                <button
                  type="button"
                  onClick={() => klikKolom(k.key)}
                  className="flex items-center gap-1 hover:text-neutral-900 dark:hover:text-neutral-100"
                >
                  {k.label}
                  {sortKey === k.key && <span className="text-xs">{aflopend ? "▼" : "▲"}</span>}
                </button>
              </th>
            ))}
            <th className="py-2 font-medium text-neutral-600 dark:text-neutral-400">Acties</th>
          </tr>
        </thead>
        <tbody>
          {gesorteerd.map((w) => (
            <VastgoedRij key={w.id} waarde={w} onBijgewerkt={onBijgewerkt} onVerwijderd={onVerwijderd} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
