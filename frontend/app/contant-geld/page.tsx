"use client";

import { useEffect, useState } from "react";

import {
  ApiError,
  deleteContantGeldLocatie,
  getContantGeld,
  postContantGeldLocatie,
  putContantGeldLocatie,
  putContantGeldTellingen,
  type ContantGeldLocatie,
  type ContantGeldResponse,
} from "@/lib/api";

const bedragFormat = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });

const inputKlasse =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-base text-neutral-900 sm:text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100";

// Coupures t/m 2 euro zijn munten, alles erboven briefgeld — bepaalt waar
// de visuele scheidingslijn in de tabel komt.
const MUNTEN_GRENS = 2;

function AantalInput({
  locatieId,
  coupure,
  aantal,
  onOpgeslagen,
}: {
  locatieId: number;
  coupure: number;
  aantal: number;
  onOpgeslagen: (locatie: ContantGeldLocatie) => void;
}) {
  const [waarde, setWaarde] = useState(String(aantal));
  const [bezig, setBezig] = useState(false);

  async function opslaan() {
    const nieuw = Math.max(0, Math.round(Number(waarde) || 0));
    setWaarde(String(nieuw));
    if (nieuw === aantal) return;
    setBezig(true);
    try {
      const locatie = await putContantGeldTellingen(locatieId, [{ coupure, aantal: nieuw }]);
      onOpgeslagen(locatie);
    } catch {
      setWaarde(String(aantal));
    } finally {
      setBezig(false);
    }
  }

  return (
    <input
      type="number"
      inputMode="numeric"
      min={0}
      disabled={bezig}
      value={waarde}
      onChange={(e) => setWaarde(e.target.value)}
      onBlur={opslaan}
      className="w-16 rounded-md border border-neutral-300 bg-white px-2 py-1 text-right text-sm text-neutral-900 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
    />
  );
}

function LocatieNaam({
  locatie,
  onOpgeslagen,
}: {
  locatie: ContantGeldLocatie;
  onOpgeslagen: (locatie: ContantGeldLocatie) => void;
}) {
  const [naam, setNaam] = useState(locatie.naam);
  const [bezig, setBezig] = useState(false);

  async function opslaan() {
    const nieuweNaam = naam.trim();
    if (!nieuweNaam || nieuweNaam === locatie.naam) {
      setNaam(locatie.naam);
      return;
    }
    setBezig(true);
    try {
      const bijgewerkt = await putContantGeldLocatie(locatie.id, { naam: nieuweNaam });
      onOpgeslagen(bijgewerkt);
    } catch {
      setNaam(locatie.naam);
    } finally {
      setBezig(false);
    }
  }

  return (
    <input
      type="text"
      disabled={bezig}
      value={naam}
      onChange={(e) => setNaam(e.target.value)}
      onBlur={opslaan}
      className="w-32 rounded-md border border-transparent bg-transparent px-1 py-1 text-sm font-medium text-neutral-900 hover:border-neutral-300 focus:border-neutral-300 focus:bg-white disabled:opacity-50 dark:text-neutral-100 dark:hover:border-neutral-700 dark:focus:border-neutral-700 dark:focus:bg-neutral-900"
    />
  );
}

export default function ContantGeldPagina() {
  const [data, setData] = useState<ContantGeldResponse | null>(null);
  const [nieuweLocatieNaam, setNieuweLocatieNaam] = useState("");
  const [bezig, setBezig] = useState(false);
  const [foutmelding, setFoutmelding] = useState<string | null>(null);

  useEffect(() => {
    getContantGeld()
      .then(setData)
      .catch((err) => setFoutmelding(err instanceof ApiError ? err.message : "Kon contant geld niet laden."));
  }, []);

  function herbereken(locaties: ContantGeldLocatie[]): number {
    return Math.round(locaties.reduce((s, l) => s + l.totaal, 0) * 100) / 100;
  }

  function locatieBijgewerkt(bijgewerkt: ContantGeldLocatie) {
    setData((huidig) => {
      if (!huidig) return huidig;
      const locaties = huidig.locaties.map((l) => (l.id === bijgewerkt.id ? bijgewerkt : l));
      return { ...huidig, locaties, totaal_algemeen: herbereken(locaties) };
    });
  }

  async function locatieToevoegen(e: React.FormEvent) {
    e.preventDefault();
    if (!nieuweLocatieNaam.trim()) return;
    setBezig(true);
    setFoutmelding(null);
    try {
      const locatie = await postContantGeldLocatie({ naam: nieuweLocatieNaam.trim() });
      setData((huidig) => (huidig ? { ...huidig, locaties: [...huidig.locaties, locatie] } : huidig));
      setNieuweLocatieNaam("");
    } catch (err) {
      setFoutmelding(err instanceof ApiError ? err.message : "Toevoegen mislukt.");
    } finally {
      setBezig(false);
    }
  }

  async function locatieVerwijderen(locatie: ContantGeldLocatie) {
    if (!window.confirm(`"${locatie.naam}" verwijderen?`)) return;
    try {
      await deleteContantGeldLocatie(locatie.id);
      setData((huidig) => {
        if (!huidig) return huidig;
        const locaties = huidig.locaties.filter((l) => l.id !== locatie.id);
        return { ...huidig, locaties, totaal_algemeen: herbereken(locaties) };
      });
    } catch (err) {
      setFoutmelding(err instanceof ApiError ? err.message : "Verwijderen mislukt.");
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Contant geld</h1>

      <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="text-sm text-neutral-500 dark:text-neutral-400">Totaal</div>
        <div className="text-3xl font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
          {data ? bedragFormat.format(data.totaal_algemeen) : "—"}
        </div>
      </div>

      {foutmelding && (
        <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {foutmelding}
        </p>
      )}

      {!data && !foutmelding && <p className="text-sm text-neutral-400">Laden...</p>}

      {data && data.locaties.length === 0 && (
        <p className="text-sm text-neutral-400">Nog geen locaties toegevoegd. Voeg er hieronder eentje toe.</p>
      )}

      {data && data.locaties.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/60">
                <th className="sticky left-0 bg-neutral-50 px-3 py-2 text-left font-medium text-neutral-500 dark:bg-neutral-900/60 dark:text-neutral-400">
                  Locatie
                </th>
                {data.coupures.map((c, i) => (
                  <th
                    key={c}
                    className={
                      "whitespace-nowrap px-2 py-2 text-right font-medium text-neutral-500 dark:text-neutral-400" +
                      (i > 0 && data.coupures[i - 1] <= MUNTEN_GRENS && c > MUNTEN_GRENS
                        ? " border-l border-neutral-200 dark:border-neutral-800"
                        : "")
                    }
                  >
                    {bedragFormat.format(c)}
                  </th>
                ))}
                <th className="whitespace-nowrap border-l border-neutral-200 px-3 py-2 text-right font-medium text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                  Totaal
                </th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.locaties.map((locatie) => (
                <tr key={locatie.id} className="border-b border-neutral-100 last:border-b-0 dark:border-neutral-900">
                  <td className="sticky left-0 bg-white px-3 py-2 dark:bg-neutral-900">
                    <LocatieNaam locatie={locatie} onOpgeslagen={locatieBijgewerkt} />
                  </td>
                  {locatie.tellingen.map((t, i) => (
                    <td
                      key={t.coupure}
                      className={
                        "px-2 py-2 text-right" +
                        (i > 0 && locatie.tellingen[i - 1].coupure <= MUNTEN_GRENS && t.coupure > MUNTEN_GRENS
                          ? " border-l border-neutral-200 dark:border-neutral-800"
                          : "")
                      }
                    >
                      <AantalInput
                        locatieId={locatie.id}
                        coupure={t.coupure}
                        aantal={t.aantal}
                        onOpgeslagen={locatieBijgewerkt}
                      />
                    </td>
                  ))}
                  <td className="whitespace-nowrap border-l border-neutral-200 px-3 py-2 text-right font-medium tabular-nums text-neutral-900 dark:border-neutral-800 dark:text-neutral-100">
                    {bedragFormat.format(locatie.totaal)}
                  </td>
                  <td className="px-2 py-2">
                    <button
                      type="button"
                      onClick={() => locatieVerwijderen(locatie)}
                      aria-label={`${locatie.naam} verwijderen`}
                      className="text-xs text-red-700 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form onSubmit={locatieToevoegen} className="flex items-end gap-3">
        <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
          Nieuwe locatie
          <input
            type="text"
            placeholder="bijv. Portemonnee, Kluis"
            value={nieuweLocatieNaam}
            onChange={(e) => setNieuweLocatieNaam(e.target.value)}
            className={`${inputKlasse} w-56`}
          />
        </label>
        <button
          type="submit"
          disabled={bezig}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
        >
          {bezig ? "Bezig..." : "+ Locatie toevoegen"}
        </button>
      </form>
    </main>
  );
}
