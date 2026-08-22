"use client";

import { useEffect, useState } from "react";

import { FilterBalk } from "@/app/components/FilterBalk";
import { MaandChart } from "@/app/components/MaandChart";
import { MaandTabel } from "@/app/components/MaandTabel";
import {
  ApiError,
  getCategorieen,
  getMaandTotalen,
  getStatus,
  getWinkels,
  type CategorieGroep,
  type MaandTotaal,
  type StatusResponse,
} from "@/lib/api";

const datumTijdFormat = new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium", timeStyle: "short" });
const datumFormat = new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium" });

export default function Home() {
  const [categorieen, setCategorieen] = useState<CategorieGroep[]>([]);
  const [winkels, setWinkels] = useState<string[]>([]);
  const [status, setStatus] = useState<StatusResponse | null>(null);

  const [categorie, setCategorie] = useState<string | null>(null);
  const [subcategorie, setSubcategorie] = useState<string | null>(null);
  const [winkel, setWinkel] = useState<string | null>(null);
  const [periodeMaanden, setPeriodeMaanden] = useState(6);

  const [reeks, setReeks] = useState<MaandTotaal[]>([]);
  const [laden, setLaden] = useState(true);
  const [foutmelding, setFoutmelding] = useState<string | null>(null);

  useEffect(() => {
    getCategorieen()
      .then((res) => setCategorieen(res.categorieen))
      .catch((err) => setFoutmelding(err instanceof ApiError ? err.message : "Kon categorieën niet laden."));
    getWinkels()
      .then((res) => setWinkels(res.winkels))
      .catch(() => {});
    getStatus()
      .then(setStatus)
      .catch(() => {});
  }, []);

  useEffect(() => {
    getMaandTotalen({ categorie, subcategorie, winkel, maanden: periodeMaanden })
      .then((res) => setReeks(res.reeks))
      .catch((err) => setFoutmelding(err instanceof ApiError ? err.message : "Kon maandtotalen niet laden."))
      .finally(() => setLaden(false));
  }, [categorie, subcategorie, winkel, periodeMaanden]);

  function wijzigFilter(bijwerken: () => void) {
    setLaden(true);
    setFoutmelding(null);
    bijwerken();
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
          Inkomsten &amp; uitgaven per maand
        </h1>
        {status && (
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            {status.laatste_refresh && `Data bijgewerkt op ${datumTijdFormat.format(new Date(status.laatste_refresh))}`}
            {status.laatste_refresh && status.laatste_transactie && " · "}
            {status.laatste_transactie && `laatste transactie ${datumFormat.format(new Date(status.laatste_transactie))}`}
          </p>
        )}
      </div>

      <FilterBalk
        categorieen={categorieen}
        winkels={winkels}
        categorie={categorie}
        subcategorie={subcategorie}
        winkel={winkel}
        periodeMaanden={periodeMaanden}
        onCategorieChange={(c) =>
          wijzigFilter(() => {
            setCategorie(c);
            setSubcategorie(null);
          })
        }
        onSubcategorieChange={(s) => wijzigFilter(() => setSubcategorie(s))}
        onWinkelChange={(w) => wijzigFilter(() => setWinkel(w))}
        onPeriodeChange={(m) => wijzigFilter(() => setPeriodeMaanden(m))}
      />

      {foutmelding && (
        <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {foutmelding}
        </p>
      )}

      <div className={laden ? "opacity-50 transition-opacity" : "transition-opacity"}>
        <MaandChart reeks={reeks} />
      </div>

      <MaandTabel reeks={reeks} />
    </main>
  );
}
