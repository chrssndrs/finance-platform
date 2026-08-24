"use client";

import { useEffect, useState } from "react";

import { BeleggingenFormulier } from "@/app/components/BeleggingenFormulier";
import { BeleggingenGrafiek } from "@/app/components/BeleggingenGrafiek";
import { BeleggingenPositiesTabel } from "@/app/components/BeleggingenPositiesTabel";
import { BeleggingenTransactiesTabel } from "@/app/components/BeleggingenTransactiesTabel";
import { Overlay } from "@/app/components/Overlay";
import {
  ApiError,
  getBeleggingTransacties,
  getPosities,
  type BeleggingTransactie,
  type Positie,
} from "@/lib/api";

const bedragFormat = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });

export default function BeleggingenPagina() {
  const [transacties, setTransacties] = useState<BeleggingTransactie[]>([]);
  const [posities, setPosities] = useState<Positie[]>([]);
  const [laden, setLaden] = useState(true);
  const [foutmelding, setFoutmelding] = useState<string | null>(null);
  const [toonNieuw, setToonNieuw] = useState(false);
  const [bewerktTransactie, setBewerktTransactie] = useState<BeleggingTransactie | null>(null);

  function laadAlles() {
    return Promise.all([getBeleggingTransacties(), getPosities()]).then(([transactiesRes, positiesRes]) => {
      setTransacties(transactiesRes.transacties);
      setPosities(positiesRes.posities);
    });
  }

  useEffect(() => {
    laadAlles()
      .catch((err) => setFoutmelding(err instanceof ApiError ? err.message : "Kon beleggingen niet laden."))
      .finally(() => setLaden(false));
  }, []);

  function transactieOpgeslagen(transactie: BeleggingTransactie) {
    setTransacties((huidig) =>
      huidig.some((t) => t.id === transactie.id) ? huidig.map((t) => (t.id === transactie.id ? transactie : t)) : [...huidig, transactie]
    );
    setToonNieuw(false);
    setBewerktTransactie(null);
    // aantal-in-bezit en de eventueel net-ontdekte valuta raken de
    // posities-tabel — simpeler om die opnieuw op te halen dan de
    // berekening ook in de browser te dupliceren.
    getPosities().then((res) => setPosities(res.posities)).catch(() => {});
  }

  function transactieVerwijderd(id: number) {
    setTransacties((huidig) => huidig.filter((t) => t.id !== id));
    setBewerktTransactie(null);
    getPosities().then((res) => setPosities(res.posities)).catch(() => {});
  }

  const totaleWaarde = posities.reduce((som, p) => som + (p.huidige_waarde ?? 0), 0);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Beleggingen</h1>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Aan- en verkopen bijhouden, koersen worden automatisch opgehaald.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setToonNieuw(true)}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          + Transactie toevoegen
        </button>
      </div>

      {foutmelding && (
        <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {foutmelding}
        </p>
      )}

      {!laden && !foutmelding && posities.length > 0 && (
        <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="text-sm text-neutral-500 dark:text-neutral-400">Totale waarde</div>
          <div className="text-2xl font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
            {bedragFormat.format(totaleWaarde)}
          </div>
        </div>
      )}

      <div className={laden ? "flex flex-col gap-6 opacity-50 transition-opacity" : "flex flex-col gap-6 transition-opacity"}>
        {!laden && transacties.length === 0 && !foutmelding ? (
          <p className="py-10 text-center text-sm text-neutral-400">
            Nog geen transacties. Voeg je eerste aan- of verkoop toe om de portfolio-ontwikkeling te gaan bijhouden.
          </p>
        ) : (
          <>
            <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
              <BeleggingenGrafiek posities={posities} />
            </div>
            <div>
              <h2 className="mb-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Huidige posities</h2>
              <BeleggingenPositiesTabel posities={posities} />
            </div>
            <div>
              <h2 className="mb-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Transacties</h2>
              <BeleggingenTransactiesTabel transacties={transacties} onRijKlik={setBewerktTransactie} />
            </div>
          </>
        )}
      </div>

      <Overlay open={toonNieuw} onClose={() => setToonNieuw(false)} titel="Transactie toevoegen">
        <BeleggingenFormulier onOpgeslagen={transactieOpgeslagen} onAnnuleren={() => setToonNieuw(false)} />
      </Overlay>

      <Overlay open={bewerktTransactie !== null} onClose={() => setBewerktTransactie(null)} titel="Transactie bewerken">
        {bewerktTransactie && (
          <BeleggingenFormulier
            transactie={bewerktTransactie}
            onOpgeslagen={transactieOpgeslagen}
            onAnnuleren={() => setBewerktTransactie(null)}
            onVerwijderd={transactieVerwijderd}
          />
        )}
      </Overlay>
    </main>
  );
}
