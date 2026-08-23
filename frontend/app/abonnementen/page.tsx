"use client";

import { useEffect, useMemo, useState } from "react";

import { AanbevelingKaart } from "@/app/components/AanbevelingKaart";
import { AbonnementFormulier } from "@/app/components/AbonnementFormulier";
import { AbonnementKaart } from "@/app/components/AbonnementKaart";
import {
  ApiError,
  getAanbevelingen,
  getAbonnementen,
  getAfzenders,
  type Aanbeveling,
  type Abonnement,
} from "@/lib/api";

const bedragFormat = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });

type SortVeld = "eerstvolgende_afschrijving" | "naam" | "bedrag";

const SORT_OPTIES: { veld: SortVeld; label: string }[] = [
  { veld: "eerstvolgende_afschrijving", label: "Eerstvolgende afschrijving" },
  { veld: "naam", label: "Naam" },
  { veld: "bedrag", label: "Bedrag" },
];

interface SectieProps {
  titel: string;
  aantal: number;
  kleur?: string;
  children: React.ReactNode;
}

function Sectie({ titel, aantal, kleur, children }: SectieProps) {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`mb-2 flex items-center gap-1.5 text-sm font-semibold ${kleur ?? "text-neutral-900 dark:text-neutral-100"}`}
      >
        <span className="text-xs">{open ? "▼" : "▶"}</span>
        {titel} ({aantal})
      </button>
      {open && children}
    </div>
  );
}

export default function AbonnementenPagina() {
  const [abonnementen, setAbonnementen] = useState<Abonnement[]>([]);
  const [totaalPerMaand, setTotaalPerMaand] = useState(0);
  const [aanbevelingen, setAanbevelingen] = useState<Aanbeveling[]>([]);
  const [afzenders, setAfzenders] = useState<string[]>([]);
  const [laden, setLaden] = useState(true);
  const [foutmelding, setFoutmelding] = useState<string | null>(null);
  const [sortVeld, setSortVeld] = useState<SortVeld>("eerstvolgende_afschrijving");
  const [aflopend, setAflopend] = useState(false);
  const [toonFormulier, setToonFormulier] = useState(false);

  function laadAlles() {
    return Promise.all([getAbonnementen(), getAanbevelingen(), getAfzenders({ categorie: null, subcategorie: null })]).then(
      ([abonnementenRes, aanbevelingenRes, afzendersRes]) => {
        setAbonnementen(abonnementenRes.abonnementen);
        setTotaalPerMaand(abonnementenRes.totaal_per_maand);
        setAanbevelingen(aanbevelingenRes.aanbevelingen);
        setAfzenders(afzendersRes.afzenders);
      }
    );
  }

  useEffect(() => {
    laadAlles()
      .catch((err) => setFoutmelding(err instanceof ApiError ? err.message : "Kon abonnementen niet laden."))
      .finally(() => setLaden(false));
  }, []);

  function aanbevelingAfgehandeld(id: number) {
    setAanbevelingen((huidig) => huidig.filter((a) => a.id !== id));
    // een acceptatie verandert de abonnementen-lijst zelf ook — simpelst om
    // die opnieuw op te halen i.p.v. de invoegen/bijwerken-logica hier te dupliceren.
    getAbonnementen()
      .then((res) => {
        setAbonnementen(res.abonnementen);
        setTotaalPerMaand(res.totaal_per_maand);
      })
      .catch(() => {});
  }

  function abonnementToegevoegd(nieuw: Abonnement) {
    setAbonnementen((huidig) => [...huidig, nieuw]);
    setToonFormulier(false);
  }

  function abonnementBijgewerkt(bijgewerkt: Abonnement) {
    setAbonnementen((huidig) => huidig.map((a) => (a.id === bijgewerkt.id ? bijgewerkt : a)));
  }

  function abonnementVerwijderd(id: number) {
    setAbonnementen((huidig) => huidig.filter((a) => a.id !== id));
  }

  const gesorteerd = useMemo(() => {
    const kopie = [...abonnementen];
    kopie.sort((a, b) => {
      const va = a[sortVeld];
      const vb = b[sortVeld];
      const vergelijking = typeof va === "string" ? va.localeCompare(vb as string) : (va as number) - (vb as number);
      return aflopend ? -vergelijking : vergelijking;
    });
    return kopie;
  }, [abonnementen, sortVeld, aflopend]);

  function kiesSort(veld: SortVeld) {
    if (veld === sortVeld) {
      setAflopend((v) => !v);
    } else {
      setSortVeld(veld);
      setAflopend(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Abonnementen</h1>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Handmatig beheerd, aangevuld met automatische suggesties uit je banktransacties.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setToonFormulier((v) => !v)}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          {toonFormulier ? "Annuleren" : "+ Nieuw abonnement"}
        </button>
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

      {toonFormulier && (
        <AbonnementFormulier
          afzenders={afzenders}
          onOpgeslagen={abonnementToegevoegd}
          onAnnuleren={() => setToonFormulier(false)}
        />
      )}

      {!laden && aanbevelingen.length > 0 && (
        <Sectie titel="Aanbevelingen" aantal={aanbevelingen.length} kleur="text-amber-700 dark:text-amber-400">
          <div className="flex flex-col gap-3">
            {aanbevelingen.map((a) => (
              <AanbevelingKaart key={a.id} aanbeveling={a} onAfgehandeld={aanbevelingAfgehandeld} />
            ))}
          </div>
        </Sectie>
      )}

      {!laden && abonnementen.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400">
          Sorteer op
          {SORT_OPTIES.map((o) => (
            <button
              key={o.veld}
              type="button"
              onClick={() => kiesSort(o.veld)}
              className={
                "flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs " +
                (sortVeld === o.veld
                  ? "border-neutral-900 text-neutral-900 dark:border-neutral-100 dark:text-neutral-100"
                  : "border-neutral-300 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800")
              }
            >
              {o.label}
              {sortVeld === o.veld && <span>{aflopend ? "▼" : "▲"}</span>}
            </button>
          ))}
        </div>
      )}

      <div className={laden ? "opacity-50 transition-opacity" : "transition-opacity"}>
        {!laden && abonnementen.length === 0 && !foutmelding ? (
          <p className="py-10 text-center text-sm text-neutral-400">
            Nog geen abonnementen. Voeg er handmatig een toe, of accepteer een aanbeveling hierboven.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {gesorteerd.map((a) => (
              <AbonnementKaart
                key={a.id}
                abonnement={a}
                afzenders={afzenders}
                onBijgewerkt={abonnementBijgewerkt}
                onVerwijderd={abonnementVerwijderd}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
