"use client";

import { useMemo, useState } from "react";

import { Combobox } from "@/app/components/Combobox";
import {
  ApiError,
  deleteInboedelArtikel,
  putInboedelArtikel,
  type InboedelArtikel,
  type InboedelArtikelInvoer,
} from "@/lib/api";

const bedragFormat = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });
const datumFormat = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", year: "numeric" });

type SortKey =
  | "omschrijving"
  | "merk"
  | "model"
  | "winkel"
  | "bedrag"
  | "datum"
  | "levensduur_maanden"
  | "restwaarde"
  | "serienummer";

const KOLOMMEN: { key: SortKey; label: string }[] = [
  { key: "omschrijving", label: "Omschrijving" },
  { key: "merk", label: "Merk" },
  { key: "model", label: "Model" },
  { key: "winkel", label: "Winkel" },
  { key: "bedrag", label: "Bedrag" },
  { key: "datum", label: "Datum" },
  { key: "levensduur_maanden", label: "Levensduur" },
  { key: "restwaarde", label: "Restwaarde" },
  { key: "serienummer", label: "Serienummer" },
];

function vergelijk(a: InboedelArtikel, key: SortKey): string | number {
  const v = a[key];
  if (v === null || v === undefined) return key === "bedrag" || key === "levensduur_maanden" || key === "restwaarde" ? -Infinity : "";
  return v;
}

function naarInvoer(a: InboedelArtikel): InboedelArtikelInvoer {
  return {
    omschrijving: a.omschrijving,
    merk: a.merk,
    model: a.model,
    winkel: a.winkel,
    bedrag: a.bedrag,
    datum: a.datum,
    levensduur_maanden: a.levensduur_maanden,
    serienummer: a.serienummer,
  };
}

const inputKlasse =
  "w-full min-w-[7rem] rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100";

interface InboedelRijProps {
  artikel: InboedelArtikel;
  merken: string[];
  winkels: string[];
  onBijgewerkt: (artikel: InboedelArtikel) => void;
  onVerwijderd: (id: number) => void;
}

function InboedelRij({ artikel, merken, winkels, onBijgewerkt, onVerwijderd }: InboedelRijProps) {
  const [bewerken, setBewerken] = useState(false);
  const [invoer, setInvoer] = useState<InboedelArtikelInvoer>(() => naarInvoer(artikel));
  const [bezig, setBezig] = useState(false);
  const [foutmelding, setFoutmelding] = useState<string | null>(null);

  function startBewerken() {
    setInvoer(naarInvoer(artikel));
    setFoutmelding(null);
    setBewerken(true);
  }

  async function opslaan() {
    if (!invoer.omschrijving.trim()) {
      setFoutmelding("Omschrijving is verplicht.");
      return;
    }
    setBezig(true);
    setFoutmelding(null);
    try {
      const bijgewerkt = await putInboedelArtikel(artikel.id, invoer);
      onBijgewerkt(bijgewerkt);
      setBewerken(false);
    } catch (err) {
      setFoutmelding(err instanceof ApiError ? err.message : "Opslaan mislukt.");
    } finally {
      setBezig(false);
    }
  }

  async function verwijderen() {
    if (!window.confirm(`"${artikel.omschrijving}" verwijderen?`)) return;
    setBezig(true);
    try {
      await deleteInboedelArtikel(artikel.id);
      onVerwijderd(artikel.id);
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
            type="text"
            value={invoer.omschrijving}
            onChange={(e) => setInvoer({ ...invoer, omschrijving: e.target.value })}
            className={inputKlasse}
          />
          {foutmelding && <p className="mt-1 text-xs text-red-700 dark:text-red-400">{foutmelding}</p>}
        </td>
        <td className="py-2 pr-2 align-top">
          <Combobox
            label=""
            opties={merken}
            waarde={invoer.merk}
            onChange={(v) => setInvoer({ ...invoer, merk: v })}
            vrijeInvoer
            placeholder="—"
          />
        </td>
        <td className="py-2 pr-2 align-top">
          <input
            type="text"
            value={invoer.model ?? ""}
            onChange={(e) => setInvoer({ ...invoer, model: e.target.value || null })}
            className={inputKlasse}
          />
        </td>
        <td className="py-2 pr-2 align-top">
          <Combobox
            label=""
            opties={winkels}
            waarde={invoer.winkel}
            onChange={(v) => setInvoer({ ...invoer, winkel: v })}
            vrijeInvoer
            placeholder="—"
          />
        </td>
        <td className="py-2 pr-2 align-top">
          <input
            type="text"
            inputMode="decimal"
            value={invoer.bedrag ?? ""}
            onChange={(e) => setInvoer({ ...invoer, bedrag: e.target.value ? Number(e.target.value.replace(",", ".")) : null })}
            className={inputKlasse}
          />
        </td>
        <td className="py-2 pr-2 align-top">
          <input
            type="date"
            value={invoer.datum ?? ""}
            onChange={(e) => setInvoer({ ...invoer, datum: e.target.value || null })}
            className={inputKlasse}
          />
        </td>
        <td className="py-2 pr-2 align-top">
          <input
            type="number"
            min={1}
            value={invoer.levensduur_maanden ?? ""}
            onChange={(e) => setInvoer({ ...invoer, levensduur_maanden: e.target.value ? Number(e.target.value) : null })}
            className={inputKlasse}
          />
        </td>
        <td className="py-2 pr-2 align-top" />
        <td className="py-2 pr-2 align-top">
          <input
            type="text"
            value={invoer.serienummer ?? ""}
            onChange={(e) => setInvoer({ ...invoer, serienummer: e.target.value || null })}
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
      <td className="py-2 pr-4">{artikel.omschrijving}</td>
      <td className="py-2 pr-4 text-neutral-600 dark:text-neutral-400">{artikel.merk ?? "—"}</td>
      <td className="py-2 pr-4 text-neutral-600 dark:text-neutral-400">{artikel.model ?? "—"}</td>
      <td className="py-2 pr-4 text-neutral-600 dark:text-neutral-400">{artikel.winkel ?? "—"}</td>
      <td className="py-2 pr-4 tabular-nums">{artikel.bedrag !== null ? bedragFormat.format(artikel.bedrag) : "—"}</td>
      <td className="whitespace-nowrap py-2 pr-4 tabular-nums">
        {artikel.datum ? datumFormat.format(new Date(`${artikel.datum}T00:00:00`)) : "—"}
      </td>
      <td className="whitespace-nowrap py-2 pr-4 tabular-nums">
        {artikel.levensduur_maanden !== null ? `${artikel.levensduur_maanden} mnd` : "—"}
      </td>
      <td className="py-2 pr-4 tabular-nums">
        {artikel.restwaarde !== null ? bedragFormat.format(artikel.restwaarde) : "—"}
      </td>
      <td className="py-2 pr-4 text-neutral-600 dark:text-neutral-400">{artikel.serienummer ?? "—"}</td>
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

interface InboedelTabelProps {
  artikelen: InboedelArtikel[];
  merken: string[];
  winkels: string[];
  onBijgewerkt: (artikel: InboedelArtikel) => void;
  onVerwijderd: (id: number) => void;
}

export function InboedelTabel({ artikelen, merken, winkels, onBijgewerkt, onVerwijderd }: InboedelTabelProps) {
  const [sortKey, setSortKey] = useState<SortKey>("omschrijving");
  const [aflopend, setAflopend] = useState(false);

  const gesorteerd = useMemo(() => {
    const kopie = [...artikelen];
    kopie.sort((a, b) => {
      const va = vergelijk(a, sortKey);
      const vb = vergelijk(b, sortKey);
      const vergelijking = typeof va === "string" ? va.localeCompare(vb as string) : (va as number) - (vb as number);
      return aflopend ? -vergelijking : vergelijking;
    });
    return kopie;
  }, [artikelen, sortKey, aflopend]);

  function klikKolom(key: SortKey) {
    if (key === sortKey) {
      setAflopend((v) => !v);
    } else {
      setSortKey(key);
      setAflopend(false);
    }
  }

  if (artikelen.length === 0) {
    return <p className="py-6 text-center text-sm text-neutral-400">Geen artikelen.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[960px] text-left text-sm">
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
          {gesorteerd.map((a) => (
            <InboedelRij
              key={a.id}
              artikel={a}
              merken={merken}
              winkels={winkels}
              onBijgewerkt={onBijgewerkt}
              onVerwijderd={onVerwijderd}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
