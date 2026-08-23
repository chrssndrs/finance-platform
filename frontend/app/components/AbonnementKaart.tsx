"use client";

import { useState } from "react";

import { AbonnementFormulier } from "@/app/components/AbonnementFormulier";
import { API_BASE, ApiError, deleteAbonnement, type Abonnement } from "@/lib/api";

const bedragFormat = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });

const INTERVAL_LABEL: Record<string, string> = {
  wekelijks: "Wekelijks",
  maandelijks: "Maandelijks",
  tweemaandelijks: "Tweemaandelijks",
  per_kwartaal: "Per kwartaal",
  jaarlijks: "Jaarlijks",
};

const AVATAR_KLEUREN = [
  "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  "bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300",
  "bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300",
  "bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300",
];

function avatarKleur(naam: string): string {
  let hash = 0;
  for (let i = 0; i < naam.length; i++) hash = (hash * 31 + naam.charCodeAt(i)) >>> 0;
  return AVATAR_KLEUREN[hash % AVATAR_KLEUREN.length];
}

function initialen(naam: string): string {
  const woorden = naam.trim().split(/\s+/).filter(Boolean);
  const letters = woorden.slice(0, 2).map((w) => w[0]);
  return letters.join("").toUpperCase();
}

function afschrijvingLabel(dagen: number): string {
  if (dagen < 0) return "Binnenkort verwacht";
  if (dagen === 0) return "Vandaag";
  if (dagen === 1) return "Morgen";
  return `Over ${dagen} dagen`;
}

interface AbonnementKaartProps {
  abonnement: Abonnement;
  afzenders: string[];
  onBijgewerkt: (abonnement: Abonnement) => void;
  onVerwijderd: (id: number) => void;
}

export function AbonnementKaart({ abonnement, afzenders, onBijgewerkt, onVerwijderd }: AbonnementKaartProps) {
  const [logoFout, setLogoFout] = useState(false);
  const [bewerken, setBewerken] = useState(false);
  const [bezig, setBezig] = useState(false);
  const [foutmelding, setFoutmelding] = useState<string | null>(null);
  const toonLogo = abonnement.logo_url && !logoFout;

  async function verwijderen() {
    if (!window.confirm(`"${abonnement.naam}" verwijderen?`)) return;
    setBezig(true);
    try {
      await deleteAbonnement(abonnement.id);
      onVerwijderd(abonnement.id);
    } catch (err) {
      setFoutmelding(err instanceof ApiError ? err.message : "Verwijderen mislukt.");
      setBezig(false);
    }
  }

  if (bewerken) {
    return (
      <div className="sm:col-span-2 lg:col-span-3">
        <AbonnementFormulier
          afzenders={afzenders}
          abonnement={abonnement}
          onOpgeslagen={(bijgewerkt) => {
            onBijgewerkt(bijgewerkt);
            setBewerken(false);
          }}
          onAnnuleren={() => setBewerken(false)}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      {toonLogo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`${API_BASE}${abonnement.logo_url}`}
          alt=""
          className="h-11 w-11 flex-shrink-0 rounded-lg object-contain"
          onError={() => setLogoFout(true)}
        />
      ) : (
        <div
          className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg text-sm font-semibold ${avatarKleur(abonnement.naam)}`}
        >
          {initialen(abonnement.naam)}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="truncate font-medium text-neutral-900 dark:text-neutral-100">{abonnement.naam}</div>
        <div className="text-sm text-neutral-500 dark:text-neutral-400">
          {bedragFormat.format(abonnement.bedrag)} · {INTERVAL_LABEL[abonnement.interval] ?? abonnement.interval}
        </div>
        <div className="mt-1 flex gap-2 text-xs">
          <button
            type="button"
            onClick={() => setBewerken(true)}
            className="text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
          >
            Bewerken
          </button>
          <button
            type="button"
            disabled={bezig}
            onClick={verwijderen}
            className="text-red-700 hover:text-red-900 disabled:opacity-50 dark:text-red-400 dark:hover:text-red-300"
          >
            Verwijderen
          </button>
        </div>
        {foutmelding && <p className="mt-1 text-xs text-red-700 dark:text-red-400">{foutmelding}</p>}
      </div>

      <div className="flex-shrink-0 text-right text-sm text-neutral-500 dark:text-neutral-400">
        {afschrijvingLabel(abonnement.dagen_tot_afschrijving)}
      </div>
    </div>
  );
}
