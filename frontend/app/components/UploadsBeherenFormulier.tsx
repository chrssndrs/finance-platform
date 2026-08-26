"use client";

import { useEffect, useState } from "react";

import {
  ApiError,
  deleteBankBestand,
  getBankBestanden,
  getBanken,
  type Bank,
  type BankBestand,
} from "@/lib/api";

const inputKlasse =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-base text-neutral-900 sm:text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100";

const datumFormat = new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium", timeStyle: "short" });

function formatteerGrootte(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function UploadsBeherenFormulier({ onAnnuleren }: { onAnnuleren: () => void }) {
  const [banken, setBanken] = useState<Bank[]>([]);
  const [gekozenBank, setGekozenBank] = useState("");
  const [bestanden, setBestanden] = useState<BankBestand[]>([]);
  const [laden, setLaden] = useState(true);
  const [bezigMet, setBezigMet] = useState<string | null>(null);
  const [foutmelding, setFoutmelding] = useState<string | null>(null);
  const [succesmelding, setSuccesmelding] = useState<string | null>(null);

  useEffect(() => {
    getBanken()
      .then((res) => {
        setBanken(res.banken);
        if (res.banken.length > 0) setGekozenBank(res.banken[0].bank);
        else setLaden(false);
      })
      .catch((err) => {
        setFoutmelding(err instanceof ApiError ? err.message : "Kon banken niet laden.");
        setLaden(false);
      });
  }, []);

  useEffect(() => {
    if (!gekozenBank) return;
    getBankBestanden(gekozenBank)
      .then((res) => setBestanden(res.bestanden))
      .catch((err) => setFoutmelding(err instanceof ApiError ? err.message : "Kon bestanden niet laden."))
      .finally(() => setLaden(false));
  }, [gekozenBank]);

  function kiesBank(bank: string) {
    setLaden(true);
    setFoutmelding(null);
    setGekozenBank(bank);
  }

  async function verwijderen(bestandsnaam: string) {
    if (!window.confirm(`"${bestandsnaam}" verwijderen en de pipeline opnieuw draaien?`)) return;
    setBezigMet(bestandsnaam);
    setFoutmelding(null);
    setSuccesmelding(null);
    try {
      await deleteBankBestand(gekozenBank, bestandsnaam);
      setBestanden((huidig) => huidig.filter((b) => b.bestandsnaam !== bestandsnaam));
      setSuccesmelding(`"${bestandsnaam}" verwijderd — pipeline opnieuw gedraaid.`);
    } catch (err) {
      setFoutmelding(err instanceof ApiError ? err.message : "Verwijderen mislukt.");
    } finally {
      setBezigMet(null);
    }
  }

  if (banken.length === 0 && !laden) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Nog geen banken geregistreerd.</p>
        <button
          type="button"
          onClick={onAnnuleren}
          className="self-start rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          Sluiten
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
        Bank
        <select value={gekozenBank} onChange={(e) => kiesBank(e.target.value)} className={inputKlasse}>
          {banken.map((b) => (
            <option key={b.bank} value={b.bank}>
              {b.naam}
            </option>
          ))}
        </select>
      </label>

      {foutmelding && <p className="text-sm text-red-700 dark:text-red-400">{foutmelding}</p>}
      {succesmelding && <p className="text-sm text-emerald-700 dark:text-emerald-400">✓ {succesmelding}</p>}

      <div className={laden ? "opacity-50 transition-opacity" : "transition-opacity"}>
        {!laden && bestanden.length === 0 ? (
          <p className="py-4 text-center text-sm text-neutral-400">Geen geüploade bestanden voor deze bank.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {bestanden.map((b) => (
              <div
                key={b.bestandsnaam}
                className="flex items-center justify-between gap-3 rounded-md border border-neutral-200 px-3 py-2 dark:border-neutral-800"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm text-neutral-900 dark:text-neutral-100">{b.bestandsnaam}</div>
                  <div className="text-xs text-neutral-400">
                    {formatteerGrootte(b.grootte_bytes)} · {datumFormat.format(new Date(b.aangemaakt_op))}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={bezigMet === b.bestandsnaam}
                  onClick={() => verwijderen(b.bestandsnaam)}
                  className="flex-shrink-0 text-sm text-red-700 hover:text-red-900 disabled:opacity-50 dark:text-red-400 dark:hover:text-red-300"
                >
                  {bezigMet === b.bestandsnaam ? "Bezig..." : "Verwijderen"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onAnnuleren}
        className="self-start rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
      >
        Sluiten
      </button>
    </div>
  );
}
