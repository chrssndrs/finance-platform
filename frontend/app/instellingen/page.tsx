"use client";

import { useEffect, useState } from "react";

import { ThemeToggle } from "@/app/components/ThemeToggle";
import { ApiError, getBanken, getInstellingen, putInstellingen, type Bank, type PlanningDrempelModus } from "@/lib/api";

const inputKlasse =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-base text-neutral-900 sm:text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100";

export default function InstellingenPagina() {
  const [planningDrempelModus, setPlanningDrempelModus] = useState<PlanningDrempelModus>("maanden");
  const [planningDrempelWaarde, setPlanningDrempelWaarde] = useState(3);
  const [verzamelfacturenLocatie, setVerzamelfacturenLocatie] = useState("");
  const [dataTeOudNaDagen, setDataTeOudNaDagen] = useState(7);
  const [trendVensterMaanden, setTrendVensterMaanden] = useState(3);
  const [banken, setBanken] = useState<Bank[]>([]);
  const [laden, setLaden] = useState(true);
  const [bezig, setBezig] = useState(false);
  const [foutmelding, setFoutmelding] = useState<string | null>(null);
  const [opgeslagen, setOpgeslagen] = useState(false);

  useEffect(() => {
    Promise.all([getInstellingen(), getBanken()])
      .then(([res, bankenRes]) => {
        setPlanningDrempelModus(res.instellingen.planning_drempel_modus);
        setPlanningDrempelWaarde(res.instellingen.planning_drempel_waarde);
        setVerzamelfacturenLocatie(res.instellingen.verzamelfacturen_locatie);
        setDataTeOudNaDagen(res.instellingen.data_te_oud_na_dagen);
        setTrendVensterMaanden(res.instellingen.trend_venster_maanden);
        setBanken(bankenRes.banken);
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
      const res = await putInstellingen({
        planning_drempel_modus: planningDrempelModus,
        planning_drempel_waarde: planningDrempelWaarde,
        verzamelfacturen_locatie: verzamelfacturenLocatie,
        data_te_oud_na_dagen: dataTeOudNaDagen,
        trend_venster_maanden: trendVensterMaanden,
      });
      setPlanningDrempelModus(res.instellingen.planning_drempel_modus);
      setPlanningDrempelWaarde(res.instellingen.planning_drempel_waarde);
      setVerzamelfacturenLocatie(res.instellingen.verzamelfacturen_locatie);
      setDataTeOudNaDagen(res.instellingen.data_te_oud_na_dagen);
      setTrendVensterMaanden(res.instellingen.trend_venster_maanden);
      setOpgeslagen(true);
    } catch (err) {
      setFoutmelding(err instanceof ApiError ? err.message : "Opslaan mislukt.");
    } finally {
      setBezig(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Instellingen</h1>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          Bank-exports upload je via het ⬆️-icoon in de navbar — hieronder de overige instellingen.
        </p>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <div>
          <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Weergave</div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400">Licht, donker of systeeminstelling volgen.</div>
        </div>
        <ThemeToggle />
      </div>

      {!laden && banken.length > 0 && (
        <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="mb-2 text-sm font-medium text-neutral-900 dark:text-neutral-100">Geregistreerde banken</div>
          <div className="flex flex-col gap-1.5">
            {banken.map((b) => (
              <div key={b.bank} className="flex items-center justify-between text-sm">
                <span className="text-neutral-900 dark:text-neutral-100">{b.naam}</span>
                <span className="font-mono text-xs text-neutral-500 dark:text-neutral-400">{b.locatie}</span>
              </div>
            ))}
          </div>
        </div>
      )}

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
          <div>
            <div className="mb-3 text-sm font-medium text-neutral-900 dark:text-neutral-100">Planning</div>
            <div className="flex flex-wrap items-end gap-4">
              <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
                Drempel
                <select
                  value={planningDrempelModus}
                  onChange={(e) => setPlanningDrempelModus(e.target.value as PlanningDrempelModus)}
                  className={inputKlasse}
                >
                  <option value="maanden">Maanden vóór einde levensduur</option>
                  <option value="percentage">Percentage van levensduur</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
                Waarde
                <input
                  type="number"
                  min={0.1}
                  step={0.1}
                  required
                  value={planningDrempelWaarde}
                  onChange={(e) => setPlanningDrempelWaarde(Number(e.target.value))}
                  className={`${inputKlasse} w-28`}
                />
              </label>
            </div>
            <span className="mt-1 block text-xs text-neutral-400">
              Vanaf wanneer een bijna-afgeschreven inboedel-artikel al als verwachte kostenpost in de
              Planning-module verschijnt.
            </span>
          </div>

          <div className="border-t border-neutral-200 pt-4 dark:border-neutral-800">
            <div className="mb-3 text-sm font-medium text-neutral-900 dark:text-neutral-100">Verzamelfacturen</div>
            <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
              Locatie voor geüploade verzamelfacturen
              <input
                type="text"
                required
                value={verzamelfacturenLocatie}
                onChange={(e) => setVerzamelfacturenLocatie(e.target.value)}
                className={`${inputKlasse} font-mono`}
              />
            </label>
            <span className="mt-1 block text-xs text-neutral-400">
              Pad relatief aan de gemounte data-map.
            </span>
          </div>

          <div className="border-t border-neutral-200 pt-4 dark:border-neutral-800">
            <div className="mb-3 text-sm font-medium text-neutral-900 dark:text-neutral-100">Meldingen &amp; trend</div>
            <div className="flex flex-wrap items-end gap-4">
              <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
                Data is &ldquo;te oud&rdquo; na
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    required
                    value={dataTeOudNaDagen}
                    onChange={(e) => setDataTeOudNaDagen(Number(e.target.value))}
                    className={`${inputKlasse} w-20`}
                  />
                  <span className="text-xs text-neutral-400">dagen</span>
                </div>
              </label>
              <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
                Trend-venster
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    required
                    value={trendVensterMaanden}
                    onChange={(e) => setTrendVensterMaanden(Number(e.target.value))}
                    className={`${inputKlasse} w-20`}
                  />
                  <span className="text-xs text-neutral-400">maanden</span>
                </div>
              </label>
            </div>
            <span className="mt-1 block text-xs text-neutral-400">
              Bepaalt wanneer de rode &ldquo;data is oud&rdquo;-melding verschijnt, en over hoeveel maanden het
              voortschrijdend gemiddelde in de grafieken wordt berekend.
            </span>
          </div>

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
