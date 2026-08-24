"use client";

import { useEffect, useState } from "react";

import { HypotheekFormulier } from "@/app/components/HypotheekFormulier";
import { HypotheekGrafiek } from "@/app/components/HypotheekGrafiek";
import { HypotheekLeningdelenTabel } from "@/app/components/HypotheekLeningdelenTabel";
import { Overlay } from "@/app/components/Overlay";
import {
  ApiError,
  getLeningdelen,
  getSchuldverloop,
  type Leningdeel,
  type SchuldPunt,
} from "@/lib/api";

const bedragFormat = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });

export default function HypotheekPagina() {
  const [leningdelen, setLeningdelen] = useState<Leningdeel[]>([]);
  const [reeks, setReeks] = useState<SchuldPunt[]>([]);
  const [actueleSchuld, setActueleSchuld] = useState(0);
  const [laden, setLaden] = useState(true);
  const [foutmelding, setFoutmelding] = useState<string | null>(null);
  const [toonNieuw, setToonNieuw] = useState(false);
  const [bewerktLeningdeel, setBewerktLeningdeel] = useState<Leningdeel | null>(null);

  function laadAlles() {
    return Promise.all([getLeningdelen(), getSchuldverloop()]).then(([leningdelenRes, verloopRes]) => {
      setLeningdelen(leningdelenRes.leningdelen);
      setReeks(verloopRes.reeks);
      setActueleSchuld(verloopRes.actuele_schuld_totaal);
    });
  }

  useEffect(() => {
    laadAlles()
      .catch((err) => setFoutmelding(err instanceof ApiError ? err.message : "Kon hypotheek niet laden."))
      .finally(() => setLaden(false));
  }, []);

  function leningdeelOpgeslagen() {
    setToonNieuw(false);
    setBewerktLeningdeel(null);
    laadAlles().catch(() => {});
  }

  function leningdeelVerwijderd() {
    setBewerktLeningdeel(null);
    laadAlles().catch(() => {});
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Hypotheek</h1>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Resterende schuld wordt automatisch berekend uit je leningdelen.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setToonNieuw(true)}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          + Leningdeel toevoegen
        </button>
      </div>

      {foutmelding && (
        <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {foutmelding}
        </p>
      )}

      {!laden && !foutmelding && leningdelen.length > 0 && (
        <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="text-sm text-neutral-500 dark:text-neutral-400">Actuele resterende schuld</div>
          <div className="text-2xl font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
            {bedragFormat.format(actueleSchuld)}
          </div>
        </div>
      )}

      <div className={laden ? "flex flex-col gap-6 opacity-50 transition-opacity" : "flex flex-col gap-6 transition-opacity"}>
        {!laden && leningdelen.length === 0 && !foutmelding ? (
          <p className="py-10 text-center text-sm text-neutral-400">
            Nog geen leningdelen. Voeg je hypotheekgegevens toe om de resterende schuld en het verloop te zien.
          </p>
        ) : (
          <>
            <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
              <HypotheekGrafiek reeks={reeks} />
            </div>
            <HypotheekLeningdelenTabel leningdelen={leningdelen} onRijKlik={setBewerktLeningdeel} />
          </>
        )}
      </div>

      <Overlay open={toonNieuw} onClose={() => setToonNieuw(false)} titel="Leningdeel toevoegen">
        <HypotheekFormulier onOpgeslagen={leningdeelOpgeslagen} onAnnuleren={() => setToonNieuw(false)} />
      </Overlay>

      <Overlay open={bewerktLeningdeel !== null} onClose={() => setBewerktLeningdeel(null)} titel="Leningdeel bewerken">
        {bewerktLeningdeel && (
          <HypotheekFormulier
            leningdeel={bewerktLeningdeel}
            onOpgeslagen={leningdeelOpgeslagen}
            onAnnuleren={() => setBewerktLeningdeel(null)}
            onVerwijderd={leningdeelVerwijderd}
          />
        )}
      </Overlay>
    </main>
  );
}
