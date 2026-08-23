"use client";

import { useState } from "react";

import { accepteerAanbeveling, weigerAanbeveling, ApiError, API_BASE, type Aanbeveling } from "@/lib/api";

const bedragFormat = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });

const INTERVAL_LABEL: Record<string, string> = {
  wekelijks: "Wekelijks",
  maandelijks: "Maandelijks",
  tweemaandelijks: "Tweemaandelijks",
  per_kwartaal: "Per kwartaal",
  jaarlijks: "Jaarlijks",
};

interface AanbevelingKaartProps {
  aanbeveling: Aanbeveling;
  onAfgehandeld: (id: number) => void;
}

export function AanbevelingKaart({ aanbeveling, onAfgehandeld }: AanbevelingKaartProps) {
  const [bezig, setBezig] = useState(false);
  const [foutmelding, setFoutmelding] = useState<string | null>(null);
  const [logoFout, setLogoFout] = useState(false);

  async function afhandelen(actie: (id: number) => Promise<void>) {
    setBezig(true);
    setFoutmelding(null);
    try {
      await actie(aanbeveling.id);
      onAfgehandeld(aanbeveling.id);
    } catch (err) {
      setFoutmelding(err instanceof ApiError ? err.message : "Actie mislukt.");
      setBezig(false);
    }
  }

  const isPrijswijziging = aanbeveling.type === "prijswijziging";
  const toonLogo = aanbeveling.logo_url && !logoFout;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40">
      {toonLogo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`${API_BASE}${aanbeveling.logo_url}`}
          alt=""
          className="h-11 w-11 flex-shrink-0 rounded-lg object-contain"
          onError={() => setLogoFout(true)}
        />
      ) : (
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-amber-100 text-sm font-semibold text-amber-700 dark:bg-amber-900 dark:text-amber-300">
          {aanbeveling.naam.slice(0, 2).toUpperCase()}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="truncate font-medium text-neutral-900 dark:text-neutral-100">{aanbeveling.naam}</div>
        <div className="text-sm text-neutral-600 dark:text-neutral-400">
          {isPrijswijziging ? (
            <>
              {bedragFormat.format(aanbeveling.huidig_bedrag ?? 0)} → {bedragFormat.format(aanbeveling.voorgesteld_bedrag)}
            </>
          ) : (
            <>
              {bedragFormat.format(aanbeveling.voorgesteld_bedrag)} ·{" "}
              {INTERVAL_LABEL[aanbeveling.interval ?? ""] ?? aanbeveling.interval}
            </>
          )}
        </div>
        <div className="text-xs text-amber-700 dark:text-amber-400">
          {isPrijswijziging ? "Prijswijziging gevonden" : "Nieuw abonnement gevonden"}
        </div>
        {foutmelding && <p className="mt-1 text-xs text-red-700 dark:text-red-400">{foutmelding}</p>}
      </div>

      <div className="flex flex-shrink-0 flex-col gap-1.5">
        <button
          type="button"
          disabled={bezig}
          onClick={() => afhandelen(accepteerAanbeveling)}
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-700 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
        >
          Accepteren
        </button>
        <button
          type="button"
          disabled={bezig}
          onClick={() => afhandelen(weigerAanbeveling)}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
        >
          Weigeren
        </button>
      </div>
    </div>
  );
}
