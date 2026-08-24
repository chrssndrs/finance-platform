"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { FilterBalk } from "@/app/components/FilterBalk";
import { TotalenChart, type SerieKey } from "@/app/components/TotalenChart";
import { TotalenTabel } from "@/app/components/TotalenTabel";
import { TransactieTabel } from "@/app/components/TransactieTabel";
import {
  ApiError,
  getAfzenders,
  getCategorieen,
  getStatus,
  getTotalen,
  getTransacties,
  type CategorieGroep,
  type Granulariteit,
  type PeriodeTotaal,
  type StatusResponse,
  type Transactie,
} from "@/lib/api";
import {
  berekenPeriodeBereik,
  formatteerPeriode,
  resolveerPeriodeSelectie,
  STANDAARD_PERIODE_SELECTIE,
  type PeriodeSelectie,
} from "@/lib/periode";

const datumTijdFormat = new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium", timeStyle: "short" });
const datumFormat = new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium" });

const GRANULARITEITEN: Granulariteit[] = ["dag", "week", "maand", "jaar"];

const ALLE_SERIES_ZICHTBAAR: Record<SerieKey, boolean> = {
  inkomsten: true,
  uitgaven: true,
  verwachte_inkomsten: true,
  verwachte_uitgaven: true,
};

function isGranulariteit(waarde: string | null): waarde is Granulariteit {
  return waarde !== null && (GRANULARITEITEN as string[]).includes(waarde);
}

function leesPeriodeSelectieUitQuery(searchParams: URLSearchParams): PeriodeSelectie {
  const modus = searchParams.get("periode");
  if (modus === "alles") return { modus: "alles" };
  if (modus === "aangepast") {
    const vanaf = searchParams.get("vanaf");
    const tot = searchParams.get("tot");
    if (vanaf && tot) return { modus: "aangepast", vanaf, tot };
  }
  if (modus === "relatief") {
    const aantal = Number(searchParams.get("periode_aantal"));
    const eenheid = searchParams.get("periode_eenheid");
    if (Number.isInteger(aantal) && aantal > 0 && isGranulariteit(eenheid)) {
      return { modus: "relatief", aantal, eenheid };
    }
  }
  return STANDAARD_PERIODE_SELECTIE;
}

export function UitgavenInhoud() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [categorieen, setCategorieen] = useState<CategorieGroep[]>([]);
  const [afzenders, setAfzenders] = useState<string[]>([]);
  const [status, setStatus] = useState<StatusResponse | null>(null);

  const [categorie, setCategorie] = useState<string | null>(searchParams.get("categorie"));
  const [subcategorie, setSubcategorie] = useState<string | null>(searchParams.get("subcategorie"));
  const [geselecteerdeAfzenders, setGeselecteerdeAfzenders] = useState<string[]>(() => {
    const waarde = searchParams.get("afzenders");
    return waarde ? waarde.split(",") : [];
  });
  const [zichtbareSeries, setZichtbareSeries] = useState<Record<SerieKey, boolean>>(ALLE_SERIES_ZICHTBAAR);
  const [granulariteit, setGranulariteit] = useState<Granulariteit>(
    isGranulariteit(searchParams.get("granulariteit")) ? (searchParams.get("granulariteit") as Granulariteit) : "maand"
  );
  const [periodeSelectie, setPeriodeSelectie] = useState<PeriodeSelectie>(() => leesPeriodeSelectieUitQuery(searchParams));

  const [reeks, setReeks] = useState<PeriodeTotaal[]>([]);
  const [laden, setLaden] = useState(true);
  const [foutmelding, setFoutmelding] = useState<string | null>(null);

  const [geselecteerdePeriode, setGeselecteerdePeriode] = useState<string | null>(null);
  const [transacties, setTransacties] = useState<Transactie[]>([]);
  const [ladenTransacties, setLadenTransacties] = useState(false);

  useEffect(() => {
    getCategorieen()
      .then((res) => setCategorieen(res.categorieen))
      .catch((err) => setFoutmelding(err instanceof ApiError ? err.message : "Kon categorieën niet laden."));
    getStatus()
      .then(setStatus)
      .catch(() => {});
  }, []);

  useEffect(() => {
    getAfzenders({ categorie, subcategorie })
      .then((res) => {
        setAfzenders(res.afzenders);
        setGeselecteerdeAfzenders((huidig) => huidig.filter((a) => res.afzenders.includes(a)));
      })
      .catch(() => {});
  }, [categorie, subcategorie]);

  const { vanaf, tot } = resolveerPeriodeSelectie(periodeSelectie);

  useEffect(() => {
    getTotalen({ categorie, subcategorie, afzenders: geselecteerdeAfzenders, granulariteit, vanaf, tot })
      .then((res) => setReeks(res.reeks))
      .catch((err) => setFoutmelding(err instanceof ApiError ? err.message : "Kon totalen niet laden."))
      .finally(() => setLaden(false));
  }, [categorie, subcategorie, geselecteerdeAfzenders, granulariteit, vanaf, tot]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (categorie) params.set("categorie", categorie);
    if (subcategorie) params.set("subcategorie", subcategorie);
    if (geselecteerdeAfzenders.length > 0) params.set("afzenders", geselecteerdeAfzenders.join(","));
    params.set("granulariteit", granulariteit);
    params.set("periode", periodeSelectie.modus);
    if (periodeSelectie.modus === "relatief") {
      params.set("periode_aantal", String(periodeSelectie.aantal));
      params.set("periode_eenheid", periodeSelectie.eenheid);
    } else if (periodeSelectie.modus === "aangepast") {
      params.set("vanaf", periodeSelectie.vanaf);
      params.set("tot", periodeSelectie.tot);
    }
    router.replace(`/uitgaven?${params}`);
  }, [categorie, subcategorie, geselecteerdeAfzenders, granulariteit, periodeSelectie, router]);

  function wijzigFilter(bijwerken: () => void) {
    setLaden(true);
    setFoutmelding(null);
    setGeselecteerdePeriode(null);
    bijwerken();
  }

  function klikPeriode(periodeStart: string) {
    if (geselecteerdePeriode === periodeStart) {
      setGeselecteerdePeriode(null);
      return;
    }
    setGeselecteerdePeriode(periodeStart);
    setLadenTransacties(true);
    const bereik = berekenPeriodeBereik(periodeStart, granulariteit);
    getTransacties({ categorie, subcategorie, afzenders: geselecteerdeAfzenders, vanaf: bereik.vanaf, tot: bereik.tot })
      .then((res) => setTransacties(res.transacties))
      .catch(() => setTransacties([]))
      .finally(() => setLadenTransacties(false));
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
        afzenders={afzenders}
        categorie={categorie}
        subcategorie={subcategorie}
        geselecteerdeAfzenders={geselecteerdeAfzenders}
        granulariteit={granulariteit}
        periodeSelectie={periodeSelectie}
        onCategorieChange={(c) =>
          wijzigFilter(() => {
            setCategorie(c);
            setSubcategorie(null);
          })
        }
        onSubcategorieChange={(s) => wijzigFilter(() => setSubcategorie(s))}
        onAfzendersChange={(a) => wijzigFilter(() => setGeselecteerdeAfzenders(a))}
        onGranulariteitChange={(g) => wijzigFilter(() => setGranulariteit(g))}
        onPeriodeSelectieChange={(p) => wijzigFilter(() => setPeriodeSelectie(p))}
        onReset={() =>
          wijzigFilter(() => {
            setCategorie(null);
            setSubcategorie(null);
            setGeselecteerdeAfzenders([]);
            setGranulariteit("maand");
            setPeriodeSelectie(STANDAARD_PERIODE_SELECTIE);
          })
        }
        zichtbareSeries={zichtbareSeries}
        onZichtbareSeriesChange={setZichtbareSeries}
      />

      {foutmelding && (
        <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {foutmelding}
        </p>
      )}

      <div className={laden ? "opacity-50 transition-opacity" : "transition-opacity"}>
        <TotalenChart
          reeks={reeks}
          granulariteit={granulariteit}
          geselecteerdePeriode={geselecteerdePeriode}
          onPeriodeKlik={klikPeriode}
          toonVerwacht
          zichtbareSeries={zichtbareSeries}
        />
      </div>

      <TotalenTabel
        reeks={reeks}
        granulariteit={granulariteit}
        geselecteerdePeriode={geselecteerdePeriode}
        onPeriodeKlik={klikPeriode}
        zichtbareSeries={zichtbareSeries}
      />

      {geselecteerdePeriode && (
        <TransactieTabel
          titel={`Transacties — ${formatteerPeriode(geselecteerdePeriode, granulariteit)}`}
          transacties={transacties}
          laden={ladenTransacties}
          onSluiten={() => setGeselecteerdePeriode(null)}
        />
      )}
    </main>
  );
}
