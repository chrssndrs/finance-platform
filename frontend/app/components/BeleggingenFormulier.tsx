"use client";

import { useState } from "react";

import { TickerZoeker } from "@/app/components/TickerZoeker";
import {
  ApiError,
  deleteBeleggingTransactie,
  postBeleggingTransactie,
  putBeleggingTransactie,
  type BeleggingTransactie,
  type BeleggingTransactieInvoer,
  type TickerZoekResultaat,
} from "@/lib/api";

const inputKlasse =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-base text-neutral-900 sm:text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100";

interface BeleggingenFormulierProps {
  portefeuilleId: number;
  transactie?: BeleggingTransactie;
  onOpgeslagen: (transactie: BeleggingTransactie) => void;
  onAnnuleren?: () => void;
  onVerwijderd?: (id: number) => void;
}

export function BeleggingenFormulier({ portefeuilleId, transactie, onOpgeslagen, onAnnuleren, onVerwijderd }: BeleggingenFormulierProps) {
  const [datum, setDatum] = useState(transactie?.datum ?? "");
  const [type, setType] = useState<"koop" | "verkoop">(transactie?.type ?? "koop");
  const [code, setCode] = useState(transactie?.code ?? "");
  const [naam, setNaam] = useState(transactie?.naam ?? "");
  const [aantal, setAantal] = useState(transactie ? String(transactie.aantal).replace(".", ",") : "");
  const [prijsPerStuk, setPrijsPerStuk] = useState(
    transactie ? String(transactie.prijs_per_stuk).replace(".", ",") : ""
  );
  const [valuta, setValuta] = useState(transactie?.valuta ?? "EUR");
  const [kosten, setKosten] = useState(transactie?.kosten != null ? String(transactie.kosten).replace(".", ",") : "");
  const [bezig, setBezig] = useState(false);
  const [bezigMetVerwijderen, setBezigMetVerwijderen] = useState(false);
  const [foutmelding, setFoutmelding] = useState<string | null>(null);

  function tickerGekozen(resultaat: TickerZoekResultaat) {
    setCode(resultaat.symbol);
    setNaam(resultaat.naam);
  }

  async function versturen(e: React.FormEvent) {
    e.preventDefault();
    if (!datum || !code.trim() || !aantal.trim() || !prijsPerStuk.trim()) {
      setFoutmelding("Datum, aandeel/tracker, aantal en prijs per stuk zijn verplicht.");
      return;
    }
    setBezig(true);
    setFoutmelding(null);
    const invoer: BeleggingTransactieInvoer = {
      portefeuille_id: portefeuilleId,
      datum,
      type,
      code: code.trim(),
      naam: naam.trim() || null,
      aantal: Number(aantal.replace(",", ".")),
      prijs_per_stuk: Number(prijsPerStuk.replace(",", ".")),
      valuta: valuta.trim() || "EUR",
      kosten: kosten.trim() ? Number(kosten.replace(",", ".")) : null,
    };
    try {
      const resultaat = transactie
        ? await putBeleggingTransactie(transactie.id, invoer)
        : await postBeleggingTransactie(invoer);
      onOpgeslagen(resultaat);
    } catch (err) {
      setFoutmelding(err instanceof ApiError ? err.message : "Opslaan mislukt.");
    } finally {
      setBezig(false);
    }
  }

  async function verwijderen() {
    if (!transactie || !onVerwijderd) return;
    if (!window.confirm(`${transactie.type === "koop" ? "Aankoop" : "Verkoop"} van ${transactie.code} verwijderen?`)) return;
    setBezigMetVerwijderen(true);
    try {
      await deleteBeleggingTransactie(transactie.id);
      onVerwijderd(transactie.id);
    } catch (err) {
      setFoutmelding(err instanceof ApiError ? err.message : "Verwijderen mislukt.");
      setBezigMetVerwijderen(false);
    }
  }

  return (
    <form onSubmit={versturen} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
        Datum
        <input type="date" required value={datum} onChange={(e) => setDatum(e.target.value)} className={inputKlasse} />
      </label>

      <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
        Type
        <select value={type} onChange={(e) => setType(e.target.value as "koop" | "verkoop")} className={inputKlasse}>
          <option value="koop">Koop</option>
          <option value="verkoop">Verkoop</option>
        </select>
      </label>

      <div className="sm:col-span-2">
        <TickerZoeker code={code} onCodeTypen={setCode} onGekozen={tickerGekozen} />
      </div>

      <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
        Aantal
        <input
          type="text"
          inputMode="decimal"
          required
          placeholder="0"
          value={aantal}
          onChange={(e) => setAantal(e.target.value)}
          className={inputKlasse}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
        Prijs per stuk
        <input
          type="text"
          inputMode="decimal"
          required
          placeholder="0,00"
          value={prijsPerStuk}
          onChange={(e) => setPrijsPerStuk(e.target.value)}
          className={inputKlasse}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
        Valuta
        <input type="text" value={valuta} onChange={(e) => setValuta(e.target.value.toUpperCase())} className={inputKlasse} />
      </label>

      <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
        Kosten (optioneel, EUR)
        <input
          type="text"
          inputMode="decimal"
          placeholder="0,00"
          value={kosten}
          onChange={(e) => setKosten(e.target.value)}
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
          {bezig ? "Bezig..." : transactie ? "Opslaan" : "Transactie toevoegen"}
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
        {transactie && onVerwijderd && (
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
