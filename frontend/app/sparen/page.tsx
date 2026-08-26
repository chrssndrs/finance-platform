"use client";

import { useEffect, useState } from "react";

import { Overlay } from "@/app/components/Overlay";
import { SpaarrekeningDoelFormulier } from "@/app/components/SpaarrekeningDoelFormulier";
import { ApiError, getSparen, putHandmatigSpaarsaldo, type SpaarRekening, type SparenResponse } from "@/lib/api";

const bedragFormat = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });
const datumFormat = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", year: "numeric" });
const percentageFormat = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 0 });

const inputKlasse =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-base text-neutral-900 sm:text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100";

export default function SparenPagina() {
  const [data, setData] = useState<SparenResponse | null>(null);
  const [handmatigInvoer, setHandmatigInvoer] = useState("");
  const [bezig, setBezig] = useState(false);
  const [foutmelding, setFoutmelding] = useState<string | null>(null);
  const [bewerktRekening, setBewerktRekening] = useState<SpaarRekening | null>(null);

  useEffect(() => {
    getSparen()
      .then((res) => {
        setData(res);
        setHandmatigInvoer(String(res.handmatig_saldo).replace(".", ","));
      })
      .catch((err) => setFoutmelding(err instanceof ApiError ? err.message : "Kon sparen niet laden."));
  }, []);

  async function handmatigOpslaan() {
    const bedrag = Number(handmatigInvoer.replace(",", "."));
    if (Number.isNaN(bedrag)) {
      setFoutmelding("Ongeldig bedrag.");
      return;
    }
    setBezig(true);
    setFoutmelding(null);
    try {
      const resultaat = await putHandmatigSpaarsaldo(bedrag);
      setData(resultaat);
    } catch (err) {
      setFoutmelding(err instanceof ApiError ? err.message : "Opslaan mislukt.");
    } finally {
      setBezig(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Sparen</h1>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          Spaarrekeningen worden net als betaalrekeningen geregistreerd via het ⬆️-uploadmenu — kies daar &ldquo;Type
          rekening: Spaarrekening&rdquo; bij het toevoegen van een nieuwe bank. Klik op een rekening om een alias of
          spaardoel in te stellen.
        </p>
      </div>

      {foutmelding && (
        <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {foutmelding}
        </p>
      )}

      <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="text-sm text-neutral-500 dark:text-neutral-400">Totaal</div>
        <div className="text-3xl font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
          {data ? bedragFormat.format(data.totaal) : "—"}
        </div>
      </div>

      {!data && !foutmelding && <p className="text-sm text-neutral-400">Laden...</p>}

      {data && data.rekeningen.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
          {data.rekeningen.map((r) => {
            const percentage = r.doelbedrag ? (r.geschat_saldo / r.doelbedrag) * 100 : null;
            return (
              <button
                key={r.rekening}
                type="button"
                onClick={() => setBewerktRekening(r)}
                className="flex w-full flex-col gap-2 border-b border-neutral-100 px-4 py-3 text-left text-sm last:border-b-0 hover:bg-neutral-50 dark:border-neutral-900 dark:hover:bg-neutral-900/60"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium text-neutral-900 dark:text-neutral-100">{r.alias ?? r.naam}</div>
                    <div className="text-xs text-neutral-400">
                      {r.rekening} · laatst bekend {datumFormat.format(new Date(r.datum))}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="tabular-nums font-medium text-neutral-900 dark:text-neutral-100">
                      {bedragFormat.format(r.geschat_saldo)}
                    </span>
                    {Math.abs(r.geschat_saldo - r.saldo) >= 0.01 && (
                      <div className="text-xs text-neutral-400">
                        (geschat, laatst bekend {bedragFormat.format(r.saldo)})
                      </div>
                    )}
                  </div>
                </div>
                {r.doelbedrag !== null && percentage !== null && (
                  <div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                      <div
                        className="h-full rounded-full bg-emerald-600 dark:bg-emerald-500"
                        style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
                      />
                    </div>
                    <div className="mt-1 flex items-center justify-between text-xs text-neutral-400">
                      <span>Doel: {bedragFormat.format(r.doelbedrag)}</span>
                      <span>{percentageFormat.format(percentage)}%</span>
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {data && data.rekeningen.length === 0 && (
        <p className="text-sm text-neutral-400">
          Nog geen spaarrekeningen geregistreerd. Voeg er een toe via het uploadmenu, of vul hieronder een
          handmatig bedrag in.
        </p>
      )}

      <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-2 text-sm font-medium text-neutral-900 dark:text-neutral-100">Handmatig restbedrag</div>
        <p className="mb-3 text-xs text-neutral-500 dark:text-neutral-400">
          Voor spaargeld dat je niet als bank wilt registreren — telt gewoon mee in het totaal hierboven.
        </p>
        <div className="flex items-center gap-2">
          <input
            type="text"
            inputMode="decimal"
            value={handmatigInvoer}
            onChange={(e) => setHandmatigInvoer(e.target.value)}
            className={`${inputKlasse} w-40`}
          />
          <button
            type="button"
            disabled={bezig}
            onClick={handmatigOpslaan}
            className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
          >
            {bezig ? "Bezig..." : "Opslaan"}
          </button>
        </div>
      </div>

      <Overlay open={bewerktRekening !== null} onClose={() => setBewerktRekening(null)} titel="Spaarrekening bewerken">
        {bewerktRekening && (
          <SpaarrekeningDoelFormulier
            rekening={bewerktRekening}
            onOpgeslagen={(resultaat) => {
              setData(resultaat);
              setBewerktRekening(null);
            }}
            onAnnuleren={() => setBewerktRekening(null)}
          />
        )}
      </Overlay>
    </main>
  );
}
