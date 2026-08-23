"use client";

import { useEffect, useState } from "react";

import { VastgoedFormulier } from "@/app/components/VastgoedFormulier";
import { VastgoedGrafiek } from "@/app/components/VastgoedGrafiek";
import { VastgoedTabel } from "@/app/components/VastgoedTabel";
import { ApiError, getWaardes, getWoning, putWoning, type Waarde } from "@/lib/api";

const bedragFormat = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });

const inputKlasse =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-base text-neutral-900 sm:text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100";

export default function VastgoedPagina() {
  const [adres, setAdres] = useState("");
  const [adresInvoer, setAdresInvoer] = useState("");
  const [adresBewerken, setAdresBewerken] = useState(false);
  const [waardes, setWaardes] = useState<Waarde[]>([]);
  const [laden, setLaden] = useState(true);
  const [foutmelding, setFoutmelding] = useState<string | null>(null);
  const [toonFormulier, setToonFormulier] = useState(false);

  useEffect(() => {
    Promise.all([getWoning(), getWaardes()])
      .then(([woningRes, waardesRes]) => {
        setAdres(woningRes.adres);
        setAdresInvoer(woningRes.adres);
        setWaardes(waardesRes.waardes);
      })
      .catch((err) => setFoutmelding(err instanceof ApiError ? err.message : "Kon vastgoed niet laden."))
      .finally(() => setLaden(false));
  }, []);

  async function adresOpslaan() {
    try {
      const res = await putWoning({ adres: adresInvoer });
      setAdres(res.adres);
      setAdresBewerken(false);
    } catch (err) {
      setFoutmelding(err instanceof ApiError ? err.message : "Adres opslaan mislukt.");
    }
  }

  function waardeToegevoegd(nieuw: Waarde) {
    setWaardes((huidig) => [...huidig, nieuw]);
    setToonFormulier(false);
  }

  function waardeBijgewerkt(bijgewerkt: Waarde) {
    setWaardes((huidig) => huidig.map((w) => (w.id === bijgewerkt.id ? bijgewerkt : w)));
  }

  function waardeVerwijderd(id: number) {
    setWaardes((huidig) => huidig.filter((w) => w.id !== id));
  }

  const gesorteerdOpDatum = [...waardes].sort((a, b) => a.datum.localeCompare(b.datum));
  const laatsteWaarde = gesorteerdOpDatum.at(-1);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Vastgoed</h1>
          {adresBewerken ? (
            <div className="mt-1 flex items-center gap-2">
              <input
                type="text"
                value={adresInvoer}
                onChange={(e) => setAdresInvoer(e.target.value)}
                className={`${inputKlasse} max-w-xs`}
              />
              <button
                type="button"
                onClick={adresOpslaan}
                className="rounded-md bg-neutral-900 px-2 py-1 text-xs font-medium text-white hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900"
              >
                Opslaan
              </button>
              <button
                type="button"
                onClick={() => {
                  setAdresInvoer(adres);
                  setAdresBewerken(false);
                }}
                className="rounded-md border border-neutral-300 px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-400"
              >
                Annuleren
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAdresBewerken(true)}
              className="mt-1 text-xs text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
            >
              {adres || "Adres instellen"}
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setToonFormulier((v) => !v)}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          {toonFormulier ? "Annuleren" : "+ Waarde toevoegen"}
        </button>
      </div>

      {foutmelding && (
        <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {foutmelding}
        </p>
      )}

      {!laden && !foutmelding && laatsteWaarde && (
        <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="text-sm text-neutral-500 dark:text-neutral-400">Meest recente waarde</div>
          <div className="text-2xl font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
            {bedragFormat.format(laatsteWaarde.waarde)}
          </div>
        </div>
      )}

      {toonFormulier && <VastgoedFormulier onOpgeslagen={waardeToegevoegd} onAnnuleren={() => setToonFormulier(false)} />}

      <div className={laden ? "flex flex-col gap-6 opacity-50 transition-opacity" : "flex flex-col gap-6 transition-opacity"}>
        {!laden && waardes.length === 0 && !foutmelding ? (
          <p className="py-10 text-center text-sm text-neutral-400">
            Nog geen waardes ingevoerd. Voeg de eerste toe om de ontwikkeling te gaan bijhouden.
          </p>
        ) : (
          <>
            {waardes.length > 1 && (
              <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                <VastgoedGrafiek waardes={gesorteerdOpDatum} />
              </div>
            )}
            <VastgoedTabel waardes={waardes} onBijgewerkt={waardeBijgewerkt} onVerwijderd={waardeVerwijderd} />
          </>
        )}
      </div>
    </main>
  );
}
