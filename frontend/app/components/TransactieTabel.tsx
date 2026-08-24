"use client";

import { useEffect, useMemo, useState } from "react";

import { Overlay } from "@/app/components/Overlay";
import { ApiError, getTransactieDetail, type Transactie, type TransactieDetail } from "@/lib/api";

const bedragFormat = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });
const datumFormat = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", year: "numeric" });

type SortKey = "datum" | "afzender" | "bedrag_eur";

const KOLOMMEN: { key: SortKey; label: string }[] = [
  { key: "datum", label: "Datum" },
  { key: "afzender", label: "Tegenpartij" },
  { key: "bedrag_eur", label: "Bedrag" },
];

const VELD_LABEL: Record<string, string> = {
  transactie_id: "Transactie-ID",
  datum: "Datum",
  naam_omschrijving: "Naam/omschrijving",
  afzender: "Tegenpartij",
  winkel: "Winkel",
  rekening: "Rekening",
  tegenrekening: "Tegenrekening",
  mededelingen: "Mededelingen",
  bedrag_eur: "Bedrag",
  saldo_na_mutatie: "Saldo na mutatie",
  categorie: "Categorie",
  subcategorie: "Subcategorie",
  handmatig_overschreven: "Handmatig overschreven",
  bronbestand: "Bronbestand",
};

function DetailRij({ label, waarde }: { label: string; waarde: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-neutral-100 py-1.5 text-sm last:border-b-0 dark:border-neutral-800">
      <span className="text-neutral-500 dark:text-neutral-400">{label}</span>
      <span className="text-right text-neutral-900 dark:text-neutral-100">{waarde}</span>
    </div>
  );
}

function TransactieDetailOverlay({ transactieId, onClose }: { transactieId: string; onClose: () => void }) {
  const [detail, setDetail] = useState<TransactieDetail | null>(null);
  const [foutmelding, setFoutmelding] = useState<string | null>(null);

  useEffect(() => {
    getTransactieDetail(transactieId)
      .then(setDetail)
      .catch((err) => setFoutmelding(err instanceof ApiError ? err.message : "Kon details niet laden."));
  }, [transactieId]);

  return (
    <Overlay open onClose={onClose} titel="Transactiedetails">
      {foutmelding && <p className="text-sm text-red-700 dark:text-red-400">{foutmelding}</p>}
      {!detail && !foutmelding && <p className="text-sm text-neutral-400">Laden...</p>}
      {detail && (
        <div className="flex flex-col gap-4">
          <div>
            {(Object.keys(VELD_LABEL) as (keyof TransactieDetail)[]).map((veld) => {
              const waarde = detail[veld];
              if (waarde === null || waarde === undefined || veld === "ruwe_rij") return null;
              return (
                <DetailRij
                  key={veld}
                  label={VELD_LABEL[veld]}
                  waarde={
                    veld === "bedrag_eur" || veld === "saldo_na_mutatie"
                      ? bedragFormat.format(waarde as number)
                      : typeof waarde === "boolean"
                        ? waarde ? "Ja" : "Nee"
                        : String(waarde)
                  }
                />
              );
            })}
          </div>
          {detail.ruwe_rij && (
            <div>
              <div className="mb-1 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                Ruwe CSV-rij
              </div>
              {Object.entries(detail.ruwe_rij).map(([key, waarde]) => (
                <DetailRij key={key} label={key} waarde={waarde ?? "—"} />
              ))}
            </div>
          )}
        </div>
      )}
    </Overlay>
  );
}

interface TransactieTabelProps {
  titel: string;
  transacties: Transactie[];
  laden: boolean;
  onSluiten: () => void;
}

export function TransactieTabel({ titel, transacties, laden, onSluiten }: TransactieTabelProps) {
  const [sortKey, setSortKey] = useState<SortKey>("datum");
  const [aflopend, setAflopend] = useState(true);
  const [geselecteerdId, setGeselecteerdId] = useState<string | null>(null);

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
      setAflopend(true);
    }
  }

  return (
    <div className="rounded-md border border-neutral-200 dark:border-neutral-800">
      <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
        <h2 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{titel}</h2>
        <button
          type="button"
          onClick={onSluiten}
          aria-label="Sluiten"
          className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
        >
          ×
        </button>
      </div>

      <div className={laden ? "opacity-50 transition-opacity" : "transition-opacity"}>
        {transacties.length === 0 && !laden ? (
          <p className="px-4 py-6 text-center text-sm text-neutral-400">Geen transacties in deze periode.</p>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">
                  {KOLOMMEN.map((k) => (
                    <th key={k.key} className="px-4 py-2 font-medium">
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
                </tr>
              </thead>
              <tbody>
                {gesorteerd.map((t) => (
                  <tr
                    key={t.transactie_id}
                    onClick={() => setGeselecteerdId(t.transactie_id)}
                    className="cursor-pointer border-b border-neutral-100 hover:bg-neutral-50 dark:border-neutral-900 dark:hover:bg-neutral-900/60"
                  >
                    <td className="whitespace-nowrap px-4 py-2">{datumFormat.format(new Date(`${t.datum}T00:00:00`))}</td>
                    <td className="px-4 py-2">{t.afzender}</td>
                    <td
                      className={
                        "whitespace-nowrap px-4 py-2 tabular-nums " +
                        (t.bedrag_eur < 0 ? "text-neutral-900 dark:text-neutral-100" : "text-emerald-700 dark:text-emerald-400")
                      }
                    >
                      {bedragFormat.format(t.bedrag_eur)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {geselecteerdId && (
        <TransactieDetailOverlay transactieId={geselecteerdId} onClose={() => setGeselecteerdId(null)} />
      )}
    </div>
  );
}
