"use client";

import { useEffect, useState } from "react";

import { ApiError, getInstellingen, putInstellingen, type BeschikbareBank } from "@/lib/api";

const inputKlasse =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-base text-neutral-900 sm:text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100";

export default function InstellingenPagina() {
  const [bank, setBank] = useState("");
  const [exportLocatie, setExportLocatie] = useState("");
  const [beschikbareBanken, setBeschikbareBanken] = useState<BeschikbareBank[]>([]);
  const [laden, setLaden] = useState(true);
  const [bezig, setBezig] = useState(false);
  const [foutmelding, setFoutmelding] = useState<string | null>(null);
  const [opgeslagen, setOpgeslagen] = useState(false);

  useEffect(() => {
    getInstellingen()
      .then((res) => {
        setBank(res.instellingen.bank);
        setExportLocatie(res.instellingen.export_locatie);
        setBeschikbareBanken(res.beschikbare_banken);
      })
      .catch((err) => setFoutmelding(err instanceof ApiError ? err.message : "Kon instellingen niet laden."))
      .finally(() => setLaden(false));
  }, []);

  async function opslaan(e: React.FormEvent) {
    e.preventDefault();
    setBezig(true);
    setFoutmelding(null);
    setOpgeslagen(false);
    try {
      const res = await putInstellingen({ bank, export_locatie: exportLocatie });
      setBank(res.instellingen.bank);
      setExportLocatie(res.instellingen.export_locatie);
      setOpgeslagen(true);
    } catch (err) {
      setFoutmelding(err instanceof ApiError ? err.message : "Opslaan mislukt.");
    } finally {
      setBezig(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Instellingen</h1>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          Welke bank-export de pipeline verwerkt en waar hij die bestanden zoekt.
        </p>
      </div>

      {foutmelding && (
        <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {foutmelding}
        </p>
      )}

      {!laden && (
        <form
          onSubmit={opslaan}
          className="flex flex-col gap-4 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
        >
          <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
            Bank
            <select value={bank} onChange={(e) => setBank(e.target.value)} className={inputKlasse}>
              {beschikbareBanken.map((b) => (
                <option key={b.bank} value={b.bank}>
                  {b.naam}
                </option>
              ))}
            </select>
            <span className="text-xs text-neutral-400">
              Bepaalt welke kolommen/scheidingsteken de pipeline verwacht in je CSV-export.
            </span>
          </label>

          <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
            Locatie van de bank-exports
            <input
              type="text"
              required
              value={exportLocatie}
              onChange={(e) => setExportLocatie(e.target.value)}
              className={`${inputKlasse} font-mono`}
            />
            <span className="text-xs text-neutral-400">
              Pad relatief aan de gemounte data-map (FINANCE_DATA_ROOT) — de container ziet niets
              daarbuiten. Zet hier CSV-bestanden neer, de pipeline scant deze map elke nacht.
            </span>
          </label>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={bezig}
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
            >
              {bezig ? "Bezig..." : "Opslaan"}
            </button>
            {opgeslagen && <span className="text-sm text-emerald-700 dark:text-emerald-400">Opgeslagen.</span>}
          </div>
        </form>
      )}
    </main>
  );
}
