"use client";

import { useEffect, useState } from "react";

import { InboedelFormulier } from "@/app/components/InboedelFormulier";
import { InboedelTabel } from "@/app/components/InboedelTabel";
import {
  ApiError,
  getInboedelArtikelen,
  getInboedelOpties,
  type InboedelArtikel,
} from "@/lib/api";

const BINNEN_MAANDEN_DREMPEL = 6;

export default function InboedelPagina() {
  const [artikelen, setArtikelen] = useState<InboedelArtikel[]>([]);
  const [merken, setMerken] = useState<string[]>([]);
  const [winkels, setWinkels] = useState<string[]>([]);
  const [laden, setLaden] = useState(true);
  const [foutmelding, setFoutmelding] = useState<string | null>(null);
  const [toonFormulier, setToonFormulier] = useState(false);

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

  function artikelToegevoegd(nieuw: InboedelArtikel) {
    setArtikelen((huidig) => [...huidig, nieuw]);
    if (nieuw.merk && !merken.includes(nieuw.merk)) {
      setMerken((huidig) => [...huidig, nieuw.merk as string].sort());
    }
    if (nieuw.winkel && !winkels.includes(nieuw.winkel)) {
      setWinkels((huidig) => [...huidig, nieuw.winkel as string].sort());
    }
    setToonFormulier(false);
  }

  const afgeschreven = artikelen.filter((a) => a.is_afgeschreven);
  const binnenkortAfgeschreven = artikelen.filter(
    (a) => !a.is_afgeschreven && a.maanden_tot_afschrijving !== null && a.maanden_tot_afschrijving <= BINNEN_MAANDEN_DREMPEL
  );

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Inboedel</h1>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            {artikelen.length} artikelen bijgehouden voor onderhoud, afschrijving en vervanging.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setToonFormulier((v) => !v)}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          {toonFormulier ? "Annuleren" : "+ Nieuw artikel"}
        </button>
      </div>

      {foutmelding && (
        <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {foutmelding}
        </p>
      )}

      {toonFormulier && <InboedelFormulier merken={merken} winkels={winkels} onToegevoegd={artikelToegevoegd} />}

      <div className={laden ? "flex flex-col gap-6 opacity-50 transition-opacity" : "flex flex-col gap-6 transition-opacity"}>
        {binnenkortAfgeschreven.length > 0 && (
          <div>
            <h2 className="mb-2 text-sm font-semibold text-amber-700 dark:text-amber-400">
              Binnen {BINNEN_MAANDEN_DREMPEL} maanden afgeschreven ({binnenkortAfgeschreven.length})
            </h2>
            <InboedelTabel artikelen={binnenkortAfgeschreven} />
          </div>
        )}

        {afgeschreven.length > 0 && (
          <div>
            <h2 className="mb-2 text-sm font-semibold text-neutral-500 dark:text-neutral-400">
              Afgeschreven ({afgeschreven.length})
            </h2>
            <InboedelTabel artikelen={afgeschreven} />
          </div>
        )}

        <div>
          <h2 className="mb-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Alle artikelen ({artikelen.length})
          </h2>
          <InboedelTabel artikelen={artikelen} />
        </div>
      </div>
    </main>
  );
}
