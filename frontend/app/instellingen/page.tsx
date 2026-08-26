"use client";

import { useEffect, useState } from "react";

import { BankFormulier } from "@/app/components/BankFormulier";
import { ChartThemaKiezer } from "@/app/components/ChartThemaKiezer";
import { Overlay } from "@/app/components/Overlay";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import {
  ApiError,
  getBanken,
  getInstellingen,
  postPipelineRun,
  putInstellingen,
  type Bank,
  type PlanningDrempelModus,
} from "@/lib/api";

const inputKlasse =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-base text-neutral-900 sm:text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100";

export default function InstellingenPagina() {
  const [planningDrempelModus, setPlanningDrempelModus] = useState<PlanningDrempelModus>("maanden");
  const [planningDrempelWaarde, setPlanningDrempelWaarde] = useState(3);
  const [verzamelfacturenLocatie, setVerzamelfacturenLocatie] = useState("");
  const [dataTeOudNaDagen, setDataTeOudNaDagen] = useState(7);
  const [trendVensterMaanden, setTrendVensterMaanden] = useState(3);
  const [planningVooruitkijkMaanden, setPlanningVooruitkijkMaanden] = useState(12);
  const [banken, setBanken] = useState<Bank[]>([]);
  const [laden, setLaden] = useState(true);
  const [bezig, setBezig] = useState(false);
  const [foutmelding, setFoutmelding] = useState<string | null>(null);
  const [opgeslagen, setOpgeslagen] = useState(false);
  const [pipelineBezig, setPipelineBezig] = useState(false);
  const [pipelineResultaat, setPipelineResultaat] = useState<string | null>(null);
  const [pipelineFoutmelding, setPipelineFoutmelding] = useState<string | null>(null);
  const [bewerktBank, setBewerktBank] = useState<Bank | null>(null);

  useEffect(() => {
    Promise.all([getInstellingen(), getBanken()])
      .then(([res, bankenRes]) => {
        setPlanningDrempelModus(res.instellingen.planning_drempel_modus);
        setPlanningDrempelWaarde(res.instellingen.planning_drempel_waarde);
        setVerzamelfacturenLocatie(res.instellingen.verzamelfacturen_locatie);
        setDataTeOudNaDagen(res.instellingen.data_te_oud_na_dagen);
        setTrendVensterMaanden(res.instellingen.trend_venster_maanden);
        setPlanningVooruitkijkMaanden(res.instellingen.planning_vooruitkijk_maanden);
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
        planning_vooruitkijk_maanden: planningVooruitkijkMaanden,
      });
      setPlanningDrempelModus(res.instellingen.planning_drempel_modus);
      setPlanningDrempelWaarde(res.instellingen.planning_drempel_waarde);
      setVerzamelfacturenLocatie(res.instellingen.verzamelfacturen_locatie);
      setDataTeOudNaDagen(res.instellingen.data_te_oud_na_dagen);
      setTrendVensterMaanden(res.instellingen.trend_venster_maanden);
      setPlanningVooruitkijkMaanden(res.instellingen.planning_vooruitkijk_maanden);
      setOpgeslagen(true);
    } catch (err) {
      setFoutmelding(err instanceof ApiError ? err.message : "Opslaan mislukt.");
    } finally {
      setBezig(false);
    }
  }

  async function pipelineOpnieuwDraaien() {
    setPipelineBezig(true);
    setPipelineFoutmelding(null);
    setPipelineResultaat(null);
    try {
      const res = await postPipelineRun();
      setPipelineResultaat(res.samenvatting);
    } catch (err) {
      setPipelineFoutmelding(err instanceof ApiError ? err.message : "Pipeline draaien mislukt.");
    } finally {
      setPipelineBezig(false);
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

      <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-2">
          <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Kleurenthema grafieken</div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400">Geldt voor alle grafieken in de app.</div>
        </div>
        <ChartThemaKiezer />
      </div>

      {!laden && banken.length > 0 && (
        <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="mb-2 text-sm font-medium text-neutral-900 dark:text-neutral-100">Geregistreerde banken</div>
          <div className="flex flex-col gap-1.5">
            {banken.map((b) => (
              <button
                key={b.bank}
                type="button"
                onClick={() => setBewerktBank(b)}
                className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <span className="text-neutral-900 dark:text-neutral-100">{b.naam}</span>
                <span className="font-mono text-xs text-neutral-500 dark:text-neutral-400">{b.locatie}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <Overlay open={bewerktBank !== null} onClose={() => setBewerktBank(null)} titel="Bank bewerken">
        {bewerktBank && (
          <BankFormulier
            bank={bewerktBank}
            onOpgeslagen={(bank) => {
              setBanken((huidig) => huidig.map((b) => (b.bank === bank.bank ? bank : b)));
              setBewerktBank(null);
            }}
            onAnnuleren={() => setBewerktBank(null)}
          />
        )}
      </Overlay>

      {!laden && (
        <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Pipeline</div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400">
                Draait bronze → silver → gold → abonnementen → koersen opnieuw, ook als er geen nieuwe
                bestanden zijn.
              </div>
            </div>
            <button
              type="button"
              disabled={pipelineBezig}
              onClick={pipelineOpnieuwDraaien}
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-50 disabled:pointer-events-none dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              {pipelineBezig ? "Bezig..." : "Pipeline opnieuw draaien"}
            </button>
          </div>
          {pipelineResultaat && (
            <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-400">✓ Pipeline geslaagd.</p>
          )}
          {pipelineFoutmelding && (
            <p className="mt-2 text-sm text-red-700 dark:text-red-400">{pipelineFoutmelding}</p>
          )}
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
              <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
                Vooruitkijken
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    required
                    value={planningVooruitkijkMaanden}
                    onChange={(e) => setPlanningVooruitkijkMaanden(Number(e.target.value))}
                    className={`${inputKlasse} w-20`}
                  />
                  <span className="text-xs text-neutral-400">maanden</span>
                </div>
              </label>
            </div>
            <span className="mt-1 block text-xs text-neutral-400">
              De drempel bepaalt vanaf wanneer een bijna-afgeschreven inboedel-artikel al als verwachte
              kostenpost verschijnt. &ldquo;Vooruitkijken&rdquo; bepaalt hoever de maandelijkse
              inboedel-kostenprojectie op de Planning-pagina vooruit kijkt, los van die drempel.
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
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
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
