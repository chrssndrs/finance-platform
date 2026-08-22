"use client";

import { useEffect, useState } from "react";

import { FilterBalk } from "@/app/components/FilterBalk";
import { TotalenChart } from "@/app/components/TotalenChart";
import { TotalenTabel } from "@/app/components/TotalenTabel";
import {
  ApiError,
  getCategorieen,
  getStatus,
  getTotalen,
  getWinkels,
  type CategorieGroep,
  type Granulariteit,
  type PeriodeTotaal,
  type StatusResponse,
} from "@/lib/api";
import { PERIODE_PRESETS } from "@/lib/periode";

const datumTijdFormat = new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium", timeStyle: "short" });
const datumFormat = new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium" });

export default function Home() {
  const [categorieen, setCategorieen] = useState<CategorieGroep[]>([]);
  const [winkels, setWinkels] = useState<string[]>([]);
  const [status, setStatus] = useState<StatusResponse | null>(null);

  const [categorie, setCategorie] = useState<string | null>(null);
  const [subcategorie, setSubcategorie] = useState<string | null>(null);
  const [winkel, setWinkel] = useState<string | null>(null);
  const [granulariteit, setGranulariteit] = useState<Granulariteit>("maand");
  const [aantal, setAantal] = useState(6);

  const [reeks, setReeks] = useState<PeriodeTotaal[]>([]);
  const [laden, setLaden] = useState(true);
  const [foutmelding, setFoutmelding] = useState<string | null>(null);

  useEffect(() => {
    getCategorieen()
      .then((res) => setCategorieen(res.categorieen))
      .catch((err) => setFoutmelding(err instanceof ApiError ? err.message : "Kon categorieën niet laden."));
    getStatus()
      .then(setStatus)
      .catch(() => {});
  }, []);

  useEffect(() => {
    getWinkels({ categorie, subcategorie })
      .then((res) => {
        setWinkels(res.winkels);
        setWinkel((huidig) => (huidig && !res.winkels.includes(huidig) ? null : huidig));
      })
      .catch(() => {});
  }, [categorie, subcategorie]);

  useEffect(() => {
    getTotalen({ categorie, subcategorie, winkel, granulariteit, aantal })
      .then((res) => setReeks(res.reeks))
      .catch((err) => setFoutmelding(err instanceof ApiError ? err.message : "Kon totalen niet laden."))
      .finally(() => setLaden(false));
  }, [categorie, subcategorie, winkel, granulariteit, aantal]);

  function wijzigFilter(bijwerken: () => void) {
    setLaden(true);
    setFoutmelding(null);
    bijwerken();
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
          Inkomsten &amp; uitgaven
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
        granulariteit={granulariteit}
        aantal={aantal}
        onCategorieChange={(c) =>
          wijzigFilter(() => {
            setCategorie(c);
            setSubcategorie(null);
          })
        }
        onSubcategorieChange={(s) => wijzigFilter(() => setSubcategorie(s))}
        onWinkelChange={(w) => wijzigFilter(() => setWinkel(w))}
        onGranulariteitChange={(g) =>
          wijzigFilter(() => {
            setGranulariteit(g);
            setAantal(PERIODE_PRESETS[g][0]);
          })
        }
        onAantalChange={(n) => wijzigFilter(() => setAantal(n))}
      />

      {foutmelding && (
        <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {foutmelding}
        </p>
      )}

      <div className={laden ? "opacity-50 transition-opacity" : "transition-opacity"}>
        <TotalenChart reeks={reeks} granulariteit={granulariteit} />
      </div>

      <TotalenTabel reeks={reeks} granulariteit={granulariteit} />
    </main>
  );
}
