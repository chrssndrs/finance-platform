"use client";

import { useEffect, useState } from "react";

import { InboedelFormulier } from "@/app/components/InboedelFormulier";
import { InboedelTabel } from "@/app/components/InboedelTabel";
import { Overlay } from "@/app/components/Overlay";
import {
  ApiError,
  getInboedelArtikelen,
  getInboedelOpties,
  type InboedelArtikel,
} from "@/lib/api";

const BINNEN_MAANDEN_DREMPEL = 6;
const bedragFormat = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });
const dagbedragFormat = new Intl.NumberFormat("nl-NL", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 3,
});

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

export default function InboedelPagina() {
  const [artikelen, setArtikelen] = useState<InboedelArtikel[]>([]);
  const [merken, setMerken] = useState<string[]>([]);
  const [winkels, setWinkels] = useState<string[]>([]);
  const [laden, setLaden] = useState(true);
  const [foutmelding, setFoutmelding] = useState<string | null>(null);
  const [toonNieuw, setToonNieuw] = useState(false);
  const [bewerktArtikel, setBewerktArtikel] = useState<InboedelArtikel | null>(null);

  useEffect(() => {
    Promise.all([getInboedelArtikelen(), getInboedelOpties()])
      .then(([artikelenRes, optiesRes]) => {
        setArtikelen(artikelenRes.artikelen);
        setMerken(optiesRes.merken);
        setWinkels(optiesRes.winkels);
      })
      .catch((err) => setFoutmelding(err instanceof ApiError ? err.message : "Kon inboedel niet laden."))
      .finally(() => setLaden(false));
  }, []);

  function artikelOpgeslagen(artikel: InboedelArtikel) {
    setArtikelen((huidig) =>
      huidig.some((a) => a.id === artikel.id) ? huidig.map((a) => (a.id === artikel.id ? artikel : a)) : [...huidig, artikel]
    );
    if (artikel.merk && !merken.includes(artikel.merk)) {
      setMerken((huidig) => [...huidig, artikel.merk as string].sort());
    }
    if (artikel.winkel && !winkels.includes(artikel.winkel)) {
      setWinkels((huidig) => [...huidig, artikel.winkel as string].sort());
    }
    setToonNieuw(false);
    setBewerktArtikel(null);
  }

  function artikelVerwijderd(id: number) {
    setArtikelen((huidig) => huidig.filter((a) => a.id !== id));
    setBewerktArtikel(null);
  }

  const afgeschreven = artikelen.filter((a) => a.is_afgeschreven);
  const binnenkortAfgeschreven = artikelen.filter(
    (a) => !a.is_afgeschreven && a.maanden_tot_afschrijving !== null && a.maanden_tot_afschrijving <= BINNEN_MAANDEN_DREMPEL
  );
  const totaalRestwaarde = artikelen.reduce((som, a) => som + (a.restwaarde ?? 0), 0);
  const totaalKostenPerDag = artikelen.reduce((som, a) => som + (a.kosten_per_dag ?? 0), 0);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Inboedel</h1>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            {artikelen.length} artikelen bijgehouden voor onderhoud, afschrijving en vervanging.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setToonNieuw(true)}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          + Nieuw artikel
        </button>
      </div>

      {foutmelding && (
        <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {foutmelding}
        </p>
      )}

      {!laden && !foutmelding && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="text-sm text-neutral-500 dark:text-neutral-400">Totale restwaarde</div>
            <div className="text-2xl font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
              {bedragFormat.format(totaalRestwaarde)}
            </div>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="text-sm text-neutral-500 dark:text-neutral-400">Kosten per dag (totaal)</div>
            <div className="text-2xl font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
              {dagbedragFormat.format(totaalKostenPerDag)}
            </div>
          </div>
        </div>
      )}

      <div className={laden ? "flex flex-col gap-6 opacity-50 transition-opacity" : "flex flex-col gap-6 transition-opacity"}>
        {binnenkortAfgeschreven.length > 0 && (
          <Sectie
            titel={`Binnen ${BINNEN_MAANDEN_DREMPEL} maanden afgeschreven`}
            aantal={binnenkortAfgeschreven.length}
            kleur="text-amber-700 dark:text-amber-400"
          >
            <InboedelTabel artikelen={binnenkortAfgeschreven} onRijKlik={setBewerktArtikel} />
          </Sectie>
        )}

        {afgeschreven.length > 0 && (
          <Sectie titel="Afgeschreven" aantal={afgeschreven.length} kleur="text-neutral-500 dark:text-neutral-400">
            <InboedelTabel artikelen={afgeschreven} onRijKlik={setBewerktArtikel} />
          </Sectie>
        )}

        <Sectie titel="Alle artikelen" aantal={artikelen.length}>
          <InboedelTabel artikelen={artikelen} onRijKlik={setBewerktArtikel} />
        </Sectie>
      </div>

      <Overlay open={toonNieuw} onClose={() => setToonNieuw(false)} titel="Nieuw artikel">
        <InboedelFormulier
          merken={merken}
          winkels={winkels}
          onOpgeslagen={artikelOpgeslagen}
          onAnnuleren={() => setToonNieuw(false)}
        />
      </Overlay>

      <Overlay open={bewerktArtikel !== null} onClose={() => setBewerktArtikel(null)} titel="Artikel bewerken">
        {bewerktArtikel && (
          <InboedelFormulier
            artikel={bewerktArtikel}
            merken={merken}
            winkels={winkels}
            onOpgeslagen={artikelOpgeslagen}
            onAnnuleren={() => setBewerktArtikel(null)}
            onVerwijderd={artikelVerwijderd}
          />
        )}
      </Overlay>
    </main>
  );
}
