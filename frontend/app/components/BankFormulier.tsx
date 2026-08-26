"use client";

import { useState } from "react";

import { ApiError, putBank, type Bank, type BankRegistratie } from "@/lib/api";

const inputKlasse =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-base text-neutral-900 sm:text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100";

interface BankFormulierProps {
  bank: Bank;
  onOpgeslagen: (bank: Bank) => void;
  onAnnuleren: () => void;
}

export function BankFormulier({ bank, onOpgeslagen, onAnnuleren }: BankFormulierProps) {
  const [naam, setNaam] = useState(bank.naam);
  const [separator, setSeparator] = useState(bank.separator);
  const [rekeningType, setRekeningType] = useState<"betaalrekening" | "spaarrekening">(bank.rekening_type);
  const [datumKolom, setDatumKolom] = useState(bank.datum_kolom);
  const [datumFormaat, setDatumFormaat] = useState(bank.datum_formaat);
  const [omschrijvingKolom, setOmschrijvingKolom] = useState(bank.omschrijving_kolom);
  const [rekeningKolom, setRekeningKolom] = useState(bank.rekening_kolom);
  const [tegenrekeningKolom, setTegenrekeningKolom] = useState(bank.tegenrekening_kolom ?? "");
  const [bedragKolom, setBedragKolom] = useState(bank.bedrag_kolom);
  const [decimaalTeken, setDecimaalTeken] = useState(bank.bedrag_decimaal_teken);
  const [richtingKolom, setRichtingKolom] = useState(bank.richting_kolom ?? "");
  const [richtingNegatief, setRichtingNegatief] = useState(bank.richting_negatief_waarde ?? "");
  const [mededelingenKolom, setMededelingenKolom] = useState(bank.mededelingen_kolom ?? "");
  const [saldoKolom, setSaldoKolom] = useState(bank.saldo_kolom ?? "");
  const [bezig, setBezig] = useState(false);
  const [foutmelding, setFoutmelding] = useState<string | null>(null);

  async function opslaan(e: React.FormEvent) {
    e.preventDefault();
    if (!naam.trim() || !separator.trim() || !datumKolom.trim() || !datumFormaat.trim() || !omschrijvingKolom.trim() || !rekeningKolom.trim() || !bedragKolom.trim() || !decimaalTeken.trim()) {
      setFoutmelding("Naam, separator en de verplichte kolommen mogen niet leeg zijn.");
      return;
    }
    setBezig(true);
    setFoutmelding(null);
    const invoer: BankRegistratie = {
      bank: bank.bank,
      naam: naam.trim(),
      separator,
      datum_kolom: datumKolom.trim(),
      datum_formaat: datumFormaat.trim(),
      omschrijving_kolom: omschrijvingKolom.trim(),
      rekening_kolom: rekeningKolom.trim(),
      tegenrekening_kolom: tegenrekeningKolom.trim() || null,
      bedrag_kolom: bedragKolom.trim(),
      bedrag_decimaal_teken: decimaalTeken,
      richting_kolom: richtingKolom.trim() || null,
      richting_negatief_waarde: richtingKolom.trim() ? richtingNegatief.trim() || null : null,
      mededelingen_kolom: mededelingenKolom.trim() || null,
      saldo_kolom: saldoKolom.trim() || null,
      rekening_type: rekeningType,
    };
    try {
      const resultaat = await putBank(bank.bank, invoer);
      onOpgeslagen(resultaat);
    } catch (err) {
      setFoutmelding(err instanceof ApiError ? err.message : "Opslaan mislukt.");
    } finally {
      setBezig(false);
    }
  }

  return (
    <form onSubmit={opslaan} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
        Bank-code
        <input type="text" value={bank.bank} disabled className={`${inputKlasse} font-mono opacity-60`} />
      </label>
      <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
        Naam
        <input type="text" required value={naam} onChange={(e) => setNaam(e.target.value)} className={inputKlasse} />
      </label>

      <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
        Scheidingsteken (separator)
        <input type="text" required value={separator} onChange={(e) => setSeparator(e.target.value)} className={`${inputKlasse} w-20`} />
      </label>
      <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
        Type rekening
        <select
          value={rekeningType}
          onChange={(e) => setRekeningType(e.target.value as "betaalrekening" | "spaarrekening")}
          className={inputKlasse}
        >
          <option value="betaalrekening">Betaalrekening</option>
          <option value="spaarrekening">Spaarrekening</option>
        </select>
      </label>

      <div className="border-t border-neutral-200 pt-3 sm:col-span-2 dark:border-neutral-800">
        <div className="mb-2 text-sm font-medium text-neutral-900 dark:text-neutral-100">Verplichte kolommen</div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
            Datum
            <input type="text" required value={datumKolom} onChange={(e) => setDatumKolom(e.target.value)} className={inputKlasse} />
          </label>
          <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
            Datumformaat
            <input type="text" required placeholder="%Y%m%d" value={datumFormaat} onChange={(e) => setDatumFormaat(e.target.value)} className={inputKlasse} />
          </label>
          <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
            Tegenpartij / omschrijving
            <input type="text" required value={omschrijvingKolom} onChange={(e) => setOmschrijvingKolom(e.target.value)} className={inputKlasse} />
          </label>
          <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
            Rekening (IBAN)
            <input type="text" required value={rekeningKolom} onChange={(e) => setRekeningKolom(e.target.value)} className={inputKlasse} />
          </label>
          <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
            Bedrag
            <input type="text" required value={bedragKolom} onChange={(e) => setBedragKolom(e.target.value)} className={inputKlasse} />
          </label>
          <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
            Decimaalteken in bedragen
            <input type="text" required value={decimaalTeken} onChange={(e) => setDecimaalTeken(e.target.value)} className={`${inputKlasse} w-20`} />
          </label>
        </div>
      </div>

      <div className="border-t border-neutral-200 pt-3 sm:col-span-2 dark:border-neutral-800">
        <div className="mb-2 text-sm font-medium text-neutral-900 dark:text-neutral-100">Optioneel</div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
            Tegenrekening
            <input type="text" value={tegenrekeningKolom} onChange={(e) => setTegenrekeningKolom(e.target.value)} className={inputKlasse} />
          </label>
          <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
            Richting (bv. &ldquo;Af/Bij&rdquo;)
            <input type="text" value={richtingKolom} onChange={(e) => setRichtingKolom(e.target.value)} className={inputKlasse} />
          </label>
          {richtingKolom.trim() && (
            <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
              Waarde die &ldquo;uitgave&rdquo; betekent
              <input type="text" placeholder="bv. Af" value={richtingNegatief} onChange={(e) => setRichtingNegatief(e.target.value)} className={inputKlasse} />
            </label>
          )}
          <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
            Mededelingen
            <input type="text" value={mededelingenKolom} onChange={(e) => setMededelingenKolom(e.target.value)} className={inputKlasse} />
          </label>
          <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
            Saldo na mutatie
            <input type="text" value={saldoKolom} onChange={(e) => setSaldoKolom(e.target.value)} className={inputKlasse} />
          </label>
        </div>
      </div>

      {foutmelding && <p className="text-sm text-red-700 dark:text-red-400 sm:col-span-2">{foutmelding}</p>}

      <div className="flex items-center gap-2 sm:col-span-2">
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
