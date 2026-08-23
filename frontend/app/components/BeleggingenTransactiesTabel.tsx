"use client";

import { useMemo, useState } from "react";

import {
  ApiError,
  deleteBeleggingTransactie,
  putBeleggingTransactie,
  type BeleggingTransactie,
  type BeleggingTransactieInvoer,
} from "@/lib/api";
import { formatteerDatumKort } from "@/lib/periode";

const aantalFormat = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 6 });

function formatteerValuta(bedrag: number, valuta: string): string {
  try {
    return new Intl.NumberFormat("nl-NL", { style: "currency", currency: valuta }).format(bedrag);
  } catch {
    return `${bedrag.toFixed(2)} ${valuta}`;
  }
}

type SortKey = "datum" | "code" | "type" | "aantal";

const KOLOMMEN: { key: SortKey; label: string }[] = [
  { key: "datum", label: "Datum" },
  { key: "type", label: "Type" },
  { key: "code", label: "Aandeel/tracker" },
  { key: "aantal", label: "Aantal" },
];

function naarInvoer(t: BeleggingTransactie): BeleggingTransactieInvoer {
  return {
    datum: t.datum, type: t.type, code: t.code, naam: t.naam,
    aantal: t.aantal, prijs_per_stuk: t.prijs_per_stuk, valuta: t.valuta, kosten: t.kosten,
  };
}

const inputKlasse =
  "w-full min-w-[6rem] rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100";

interface RijProps {
  transactie: BeleggingTransactie;
  onBijgewerkt: (t: BeleggingTransactie) => void;
  onVerwijderd: (id: number) => void;
}

function BeleggingRij({ transactie, onBijgewerkt, onVerwijderd }: RijProps) {
  const [bewerken, setBewerken] = useState(false);
  const [invoer, setInvoer] = useState<BeleggingTransactieInvoer>(() => naarInvoer(transactie));
  const [bezig, setBezig] = useState(false);
  const [foutmelding, setFoutmelding] = useState<string | null>(null);

  function startBewerken() {
    setInvoer(naarInvoer(transactie));
    setFoutmelding(null);
    setBewerken(true);
  }

  async function opslaan() {
    setBezig(true);
    setFoutmelding(null);
    try {
      const bijgewerkt = await putBeleggingTransactie(transactie.id, invoer);
      onBijgewerkt(bijgewerkt);
      setBewerken(false);
    } catch (err) {
      setFoutmelding(err instanceof ApiError ? err.message : "Opslaan mislukt.");
    } finally {
      setBezig(false);
    }
  }

  async function verwijderen() {
    if (!window.confirm(`${transactie.type === "koop" ? "Aankoop" : "Verkoop"} van ${transactie.code} verwijderen?`)) return;
    setBezig(true);
    try {
      await deleteBeleggingTransactie(transactie.id);
      onVerwijderd(transactie.id);
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
          <select
            value={invoer.type}
            onChange={(e) => setInvoer({ ...invoer, type: e.target.value as "koop" | "verkoop" })}
            className={inputKlasse}
          >
            <option value="koop">Koop</option>
            <option value="verkoop">Verkoop</option>
          </select>
        </td>
        <td className="py-2 pr-2 align-top">
          <input
            type="text"
            value={invoer.code}
            onChange={(e) => setInvoer({ ...invoer, code: e.target.value })}
            className={inputKlasse}
          />
        </td>
        <td className="py-2 pr-2 align-top">
          <input
            type="text"
            inputMode="decimal"
            value={invoer.aantal}
            onChange={(e) => setInvoer({ ...invoer, aantal: Number(e.target.value.replace(",", ".")) || 0 })}
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
      <td className="py-2 pr-4 whitespace-nowrap tabular-nums">{formatteerDatumKort(transactie.datum)}</td>
      <td className="py-2 pr-4">
        <span
          className={
            "rounded-full px-2 py-0.5 text-xs font-medium " +
            (transactie.type === "koop"
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
              : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300")
          }
        >
          {transactie.type === "koop" ? "Koop" : "Verkoop"}
        </span>
      </td>
      <td className="py-2 pr-4">
        <div className="text-neutral-900 dark:text-neutral-100">{transactie.naam ?? transactie.code}</div>
        <div className="text-xs text-neutral-400">{transactie.code}</div>
      </td>
      <td className="py-2 pr-4 tabular-nums">{aantalFormat.format(transactie.aantal)}</td>
      <td className="py-2 pr-4 tabular-nums">{formatteerValuta(transactie.prijs_per_stuk, transactie.valuta)}</td>
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

interface BeleggingenTransactiesTabelProps {
  transacties: BeleggingTransactie[];
  onBijgewerkt: (t: BeleggingTransactie) => void;
  onVerwijderd: (id: number) => void;
}

export function BeleggingenTransactiesTabel({ transacties, onBijgewerkt, onVerwijderd }: BeleggingenTransactiesTabelProps) {
  const [sortKey, setSortKey] = useState<SortKey>("datum");
  const [aflopend, setAflopend] = useState(true);

  const gesorteerd = useMemo(() => {
    const kopie = [...transacties];
    kopie.sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      const vergelijking = typeof va === "string" ? va.localeCompare(vb as string) : (va as number) - (vb as number);
      return aflopend ? -vergelijking : vergelijking;
    });
    return kopie;
  }, [transacties, sortKey, aflopend]);

  function klikKolom(key: SortKey) {
    if (key === sortKey) {
      setAflopend((v) => !v);
    } else {
      setSortKey(key);
      setAflopend(false);
    }
  }

  if (transacties.length === 0) {
    return <p className="py-6 text-center text-sm text-neutral-400">Nog geen transacties ingevoerd.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
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
            <th className="py-2 pr-4 font-medium text-neutral-600 dark:text-neutral-400">Prijs per stuk</th>
            <th className="py-2 font-medium text-neutral-600 dark:text-neutral-400">Acties</th>
          </tr>
        </thead>
        <tbody>
          {gesorteerd.map((t) => (
            <BeleggingRij key={t.id} transactie={t} onBijgewerkt={onBijgewerkt} onVerwijderd={onVerwijderd} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
