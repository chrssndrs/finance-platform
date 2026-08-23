"use client";

import { useEffect, useState } from "react";

import { AbonnementKaart } from "@/app/components/AbonnementKaart";
import { ApiError, getAbonnementen, type Abonnement } from "@/lib/api";

const bedragFormat = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });

export default function AbonnementenPagina() {
  const [abonnementen, setAbonnementen] = useState<Abonnement[]>([]);
  const [totaalPerMaand, setTotaalPerMaand] = useState(0);
  const [laden, setLaden] = useState(true);
  const [foutmelding, setFoutmelding] = useState<string | null>(null);

  useEffect(() => {
    getAbonnementen()
      .then((res) => {
        setAbonnementen(res.abonnementen);
        setTotaalPerMaand(res.totaal_per_maand);
      })
      .catch((err) => setFoutmelding(err instanceof ApiError ? err.message : "Kon abonnementen niet laden."))
      .finally(() => setLaden(false));
  }, []);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Abonnementen</h1>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          Automatisch herkend uit periodieke, terugkerende afschrijvingen.
        </p>
      </div>

      {foutmelding && (
        <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {foutmelding}
        </p>
      )}

      {!laden && !foutmelding && (
        <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="text-sm text-neutral-500 dark:text-neutral-400">Totaal per maand</div>
          <div className="text-2xl font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
            {bedragFormat.format(totaalPerMaand)}
          </div>
        </div>
      )}

      <div className={laden ? "opacity-50 transition-opacity" : "transition-opacity"}>
        {!laden && abonnementen.length === 0 && !foutmelding ? (
          <p className="py-10 text-center text-sm text-neutral-400">
            Nog geen abonnementen herkend. Ze verschijnen hier zodra er genoeg regelmatige afschrijvingen zijn.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {abonnementen.map((a, i) => (
              <AbonnementKaart key={`${a.naam}-${a.bedrag}-${i}`} abonnement={a} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
