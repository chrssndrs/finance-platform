"use client";

import { useEffect, useState } from "react";

import { FilterBalk } from "@/app/components/FilterBalk";
import { MaandChart } from "@/app/components/MaandChart";
import { MaandTabel } from "@/app/components/MaandTabel";
import {
  ApiError,
  getCategorieen,
  getMaandTotalen,
  type CategorieGroep,
  type MaandTotaal,
} from "@/lib/api";

export default function Home() {
  const [categorieen, setCategorieen] = useState<CategorieGroep[]>([]);
  const [categorie, setCategorie] = useState<string | null>(null);
  const [subcategorie, setSubcategorie] = useState<string | null>(null);
  const [periodeMaanden, setPeriodeMaanden] = useState(6);

  const [reeks, setReeks] = useState<MaandTotaal[]>([]);
  const [laden, setLaden] = useState(true);
  const [foutmelding, setFoutmelding] = useState<string | null>(null);

  useEffect(() => {
    getCategorieen()
      .then((res) => setCategorieen(res.categorieen))
      .catch((err) => setFoutmelding(err instanceof ApiError ? err.message : "Kon categorieën niet laden."));
  }, []);

  useEffect(() => {
    getMaandTotalen({ categorie, subcategorie, maanden: periodeMaanden })
      .then((res) => setReeks(res.reeks))
      .catch((err) => setFoutmelding(err instanceof ApiError ? err.message : "Kon maandtotalen niet laden."))
      .finally(() => setLaden(false));
  }, [categorie, subcategorie, periodeMaanden]);

  function wijzigFilter(bijwerken: () => void) {
    setLaden(true);
    setFoutmelding(null);
    bijwerken();
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
        Inkomsten &amp; uitgaven per maand
      </h1>

      <FilterBalk
        categorieen={categorieen}
        categorie={categorie}
        subcategorie={subcategorie}
        periodeMaanden={periodeMaanden}
        onCategorieChange={(c) =>
          wijzigFilter(() => {
            setCategorie(c);
            setSubcategorie(null);
          })
        }
        onSubcategorieChange={(s) => wijzigFilter(() => setSubcategorie(s))}
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
