"use client";

import { useEffect, useState } from "react";

import { VermogenOverzicht } from "@/app/components/VermogenOverzicht";
import {
  ApiError,
  getVermogen,
  getVermogenPerMaand,
  type VermogenPerMaandPunt,
  type VermogenResponse,
} from "@/lib/api";

const bedragFormat = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });
const maandLabelFormat = new Intl.DateTimeFormat("nl-NL", { month: "long", year: "numeric" });

const MAANDEN_OPTIES = [6, 12, 24];

export default function VermogenPagina() {
  const [vermogen, setVermogen] = useState<VermogenResponse | null>(null);
  const [perMaand, setPerMaand] = useState<VermogenPerMaandPunt[]>([]);
  const [aantalMaanden, setAantalMaanden] = useState(12);
  const [laden, setLaden] = useState(true);
  const [foutmelding, setFoutmelding] = useState<string | null>(null);

  useEffect(() => {
    getVermogen()
      .then(setVermogen)
      .catch((err) => setFoutmelding(err instanceof ApiError ? err.message : "Kon vermogen niet laden."))
      .finally(() => setLaden(false));
  }, []);

  useEffect(() => {
    getVermogenPerMaand(aantalMaanden)
      .then((res) => setPerMaand(res.maanden))
      .catch(() => {});
  }, [aantalMaanden]);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Vermogen</h1>
      </div>

      {foutmelding && (
        <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {foutmelding}
        </p>
      )}

      {!laden && vermogen && <VermogenOverzicht totaal={vermogen.totaal} onderdelen={vermogen.onderdelen} />}

      <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Mutaties per maand</h2>
          <div className="flex items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400">
            {MAANDEN_OPTIES.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setAantalMaanden(m)}
                className={
                  "rounded-full border px-2.5 py-1 text-xs " +
                  (aantalMaanden === m
                    ? "border-neutral-900 text-neutral-900 dark:border-neutral-100 dark:text-neutral-100"
                    : "border-neutral-300 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800")
                }
              >
                {m} mnd
              </button>
            ))}
          </div>
        </div>

        {perMaand.length === 0 ? (
          <p className="py-6 text-center text-sm text-neutral-400">Nog niet genoeg data voor een geschiedenis.</p>
        ) : (
          <div className="flex flex-col gap-1">
            {[...perMaand].reverse().map((p) => (
              <div
                key={p.maand}
                className="flex items-center justify-between border-b border-neutral-100 py-2 text-sm last:border-b-0 dark:border-neutral-900"
              >
                <span className="text-neutral-700 dark:text-neutral-300">
                  {maandLabelFormat.format(new Date(`${p.maand}-01T00:00:00`))}
                </span>
                <div className="text-right">
                  <span className="tabular-nums font-medium text-neutral-900 dark:text-neutral-100">
                    {bedragFormat.format(p.vermogen)}
                  </span>
                  {p.mutatie !== null && (
                    <span
                      className={
                        "ml-2 tabular-nums text-xs " +
                        (p.mutatie >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400")
                      }
                    >
                      {p.mutatie >= 0 ? "+" : ""}
                      {bedragFormat.format(p.mutatie)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
