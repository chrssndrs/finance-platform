"use client";

import { useEffect, useState } from "react";

import {
  ApiError,
  detecteerBankKolommen,
  getBanken,
  postBank,
  postBankUpload,
  type Bank,
  type BankRegistratie,
} from "@/lib/api";

const inputKlasse =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-base text-neutral-900 sm:text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100";

type Stap = "uploaden" | "nieuwe-bank-1" | "nieuwe-bank-2";

const VERPLICHTE_VELDEN: { veld: keyof BankRegistratie; label: string }[] = [
  { veld: "datum_kolom", label: "Datum" },
  { veld: "bedrag_kolom", label: "Bedrag" },
  { veld: "omschrijving_kolom", label: "Tegenpartij / omschrijving" },
  { veld: "rekening_kolom", label: "Rekening (IBAN)" },
];

const OPTIONELE_VELDEN: { veld: keyof BankRegistratie; label: string }[] = [
  { veld: "tegenrekening_kolom", label: "Tegenrekening" },
  { veld: "richting_kolom", label: "Richting (bv. “Af/Bij”)" },
  { veld: "mededelingen_kolom", label: "Mededelingen" },
  { veld: "saldo_kolom", label: "Saldo na mutatie" },
];

export function BankUploadFormulier({ onKlaar, onAnnuleren }: { onKlaar: () => void; onAnnuleren: () => void }) {
  const [stap, setStap] = useState<Stap>("uploaden");
  const [banken, setBanken] = useState<Bank[]>([]);
  const [gekozenBank, setGekozenBank] = useState("");
  const [bestand, setBestand] = useState<File | null>(null);
  const [bezig, setBezig] = useState(false);
  const [foutmelding, setFoutmelding] = useState<string | null>(null);

  // stap 1 — nieuwe bank
  const [separator, setSeparator] = useState(";");
  const [kolommen, setKolommen] = useState<string[]>([]);

  // stap 2 — nieuwe bank
  const [bankSlug, setBankSlug] = useState("");
  const [bankNaam, setBankNaam] = useState("");
  const [locatie, setLocatie] = useState("");
  const [datumFormaat, setDatumFormaat] = useState("%Y%m%d");
  const [decimaalTeken, setDecimaalTeken] = useState(",");
  const [richtingNegatief, setRichtingNegatief] = useState("");
  const [mapping, setMapping] = useState<Record<string, string>>({});

  useEffect(() => {
    getBanken().then((res) => {
      setBanken(res.banken);
      if (res.banken.length > 0) setGekozenBank(res.banken[0].bank);
    });
  }, []);

  async function uploaden() {
    if (!gekozenBank || !bestand) {
      setFoutmelding("Kies een bank en een bestand.");
      return;
    }
    setBezig(true);
    setFoutmelding(null);
    try {
      await postBankUpload(gekozenBank, bestand);
      onKlaar();
    } catch (err) {
      setFoutmelding(err instanceof ApiError ? err.message : "Uploaden mislukt.");
    } finally {
      setBezig(false);
    }
  }

  async function detecteren() {
    if (!bestand) {
      setFoutmelding("Kies eerst een bestand.");
      return;
    }
    setBezig(true);
    setFoutmelding(null);
    try {
      const resultaat = await detecteerBankKolommen(bestand, separator);
      setKolommen(resultaat.kolommen);
      setStap("nieuwe-bank-2");
    } catch (err) {
      setFoutmelding(err instanceof ApiError ? err.message : "Kon de kolommen niet lezen.");
    } finally {
      setBezig(false);
    }
  }

  async function registrerenEnUploaden() {
    if (!bankSlug.trim() || !bankNaam.trim() || !locatie.trim()) {
      setFoutmelding("Bank-code, naam en locatie zijn verplicht.");
      return;
    }
    for (const { veld, label } of VERPLICHTE_VELDEN) {
      if (!mapping[veld]) {
        setFoutmelding(`Kies een kolom voor “${label}”.`);
        return;
      }
    }
    if (!bestand) return;
    setBezig(true);
    setFoutmelding(null);
    try {
      await postBank({
        bank: bankSlug.trim().toLowerCase(),
        naam: bankNaam.trim(),
        locatie: locatie.trim(),
        separator,
        datum_kolom: mapping.datum_kolom,
        datum_formaat: datumFormaat,
        omschrijving_kolom: mapping.omschrijving_kolom,
        rekening_kolom: mapping.rekening_kolom,
        tegenrekening_kolom: mapping.tegenrekening_kolom || null,
        bedrag_kolom: mapping.bedrag_kolom,
        bedrag_decimaal_teken: decimaalTeken,
        richting_kolom: mapping.richting_kolom || null,
        richting_negatief_waarde: mapping.richting_kolom ? richtingNegatief || null : null,
        mededelingen_kolom: mapping.mededelingen_kolom || null,
        saldo_kolom: mapping.saldo_kolom || null,
      });
      await postBankUpload(bankSlug.trim().toLowerCase(), bestand);
      onKlaar();
    } catch (err) {
      setFoutmelding(err instanceof ApiError ? err.message : "Registreren mislukt.");
    } finally {
      setBezig(false);
    }
  }

  if (stap === "uploaden") {
    return (
      <div className="flex flex-col gap-3">
        {banken.length > 0 && (
          <>
            <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
              Bank
              <select value={gekozenBank} onChange={(e) => setGekozenBank(e.target.value)} className={inputKlasse}>
                {banken.map((b) => (
                  <option key={b.bank} value={b.bank}>
                    {b.naam}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
              Bestand (CSV)
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setBestand(e.target.files?.[0] ?? null)}
                className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-neutral-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-neutral-700 hover:file:bg-neutral-200 dark:file:bg-neutral-800 dark:file:text-neutral-300"
              />
            </label>
            {foutmelding && <p className="text-sm text-red-700 dark:text-red-400">{foutmelding}</p>}
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={bezig}
                onClick={uploaden}
                className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
              >
                {bezig ? "Bezig..." : "Uploaden"}
              </button>
              <button
                type="button"
                onClick={onAnnuleren}
                className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                Annuleren
              </button>
            </div>
          </>
        )}
        <button
          type="button"
          onClick={() => {
            setFoutmelding(null);
            setStap("nieuwe-bank-1");
          }}
          className="self-start text-sm text-neutral-500 underline hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
        >
          + Nieuwe bank toevoegen
        </button>
      </div>
    );
  }

  if (stap === "nieuwe-bank-1") {
    return (
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
          Scheidingsteken (separator) in de CSV
          <input type="text" value={separator} onChange={(e) => setSeparator(e.target.value)} className={`${inputKlasse} w-20`} />
        </label>
        <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
          Voorbeeldbestand (CSV van de nieuwe bank)
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setBestand(e.target.files?.[0] ?? null)}
            className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-neutral-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-neutral-700 hover:file:bg-neutral-200 dark:file:bg-neutral-800 dark:file:text-neutral-300"
          />
        </label>
        {foutmelding && <p className="text-sm text-red-700 dark:text-red-400">{foutmelding}</p>}
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={bezig}
            onClick={detecteren}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
          >
            {bezig ? "Bezig..." : "Volgende"}
          </button>
          <button
            type="button"
            onClick={() => setStap("uploaden")}
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Terug
          </button>
        </div>
      </div>
    );
  }

  // stap === "nieuwe-bank-2"
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        Gevonden kolommen: {kolommen.join(", ")}
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
          Bank-code (kort, uniek)
          <input type="text" placeholder="bv. rabobank" value={bankSlug} onChange={(e) => setBankSlug(e.target.value)} className={inputKlasse} />
        </label>
        <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
          Naam
          <input type="text" placeholder="bv. Rabobank" value={bankNaam} onChange={(e) => setBankNaam(e.target.value)} className={inputKlasse} />
        </label>
        <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400 sm:col-span-2">
          Landingsmap (relatief aan de data-map)
          <input type="text" value={locatie} onChange={(e) => setLocatie(e.target.value)} className={`${inputKlasse} font-mono`} />
        </label>
        <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
          Datumformaat
          <input type="text" placeholder="%Y%m%d" value={datumFormaat} onChange={(e) => setDatumFormaat(e.target.value)} className={inputKlasse} />
        </label>
        <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
          Decimaalteken in bedragen
          <input type="text" value={decimaalTeken} onChange={(e) => setDecimaalTeken(e.target.value)} className={`${inputKlasse} w-20`} />
        </label>
      </div>

      <div className="border-t border-neutral-200 pt-3 dark:border-neutral-800">
        <div className="mb-2 text-sm font-medium text-neutral-900 dark:text-neutral-100">Verplicht</div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {VERPLICHTE_VELDEN.map(({ veld, label }) => (
            <label key={veld} className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
              {label}
              <select
                value={mapping[veld] ?? ""}
                onChange={(e) => setMapping((m) => ({ ...m, [veld]: e.target.value }))}
                className={inputKlasse}
              >
                <option value="">— kies kolom —</option>
                {kolommen.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </div>

      <div className="border-t border-neutral-200 pt-3 dark:border-neutral-800">
        <div className="mb-2 text-sm font-medium text-neutral-900 dark:text-neutral-100">Optioneel</div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {OPTIONELE_VELDEN.map(({ veld, label }) => (
            <label key={veld} className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
              {label}
              <select
                value={mapping[veld] ?? ""}
                onChange={(e) => setMapping((m) => ({ ...m, [veld]: e.target.value }))}
                className={inputKlasse}
              >
                <option value="">— geen —</option>
                {kolommen.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </label>
          ))}
          {mapping.richting_kolom && (
            <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
              Waarde die &ldquo;uitgave&rdquo; betekent in de richting-kolom
              <input
                type="text"
                placeholder="bv. Af"
                value={richtingNegatief}
                onChange={(e) => setRichtingNegatief(e.target.value)}
                className={inputKlasse}
              />
            </label>
          )}
        </div>
      </div>

      {foutmelding && <p className="text-sm text-red-700 dark:text-red-400">{foutmelding}</p>}
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={bezig}
          onClick={registrerenEnUploaden}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
        >
          {bezig ? "Bezig..." : "Opslaan en uploaden"}
        </button>
        <button
          type="button"
          onClick={() => setStap("nieuwe-bank-1")}
          className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          Terug
        </button>
      </div>
    </div>
  );
}
