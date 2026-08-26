"use client";

import { useEffect, useState } from "react";

import { ModuleKaarten, type ModuleKaartData } from "@/app/components/ModuleKaarten";
import { WidgetenSectie } from "@/app/components/WidgetenSectie";
import {
  ApiError,
  getAbonnementen,
  getInboedelArtikelen,
  getPosities,
  getSchuldverloop,
  getTotalen,
  getVastgoedLocaties,
  getWaardes,
  getWidgets,
  type Widget,
} from "@/lib/api";

function eersteVanDezeMaand(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function vandaagIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function HomePagina() {
  const [modules, setModules] = useState<ModuleKaartData[]>([]);
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [laden, setLaden] = useState(true);
  const [foutmelding, setFoutmelding] = useState<string | null>(null);

  function laadModuleKaarten() {
    return Promise.all([
      getAbonnementen(),
      getInboedelArtikelen(),
      getPosities(),
      getVastgoedLocaties(),
      getSchuldverloop(),
      getTotalen({
        categorie: null, subcategorie: null, afzenders: [],
        granulariteit: "maand", vanaf: eersteVanDezeMaand(), tot: vandaagIso(),
      }),
    ]).then(async ([abonnementen, inboedel, posities, vastgoedLocaties, hypotheek, totalen]) => {
      const inboedelWaarde = inboedel.artikelen.reduce((som, a) => som + (a.restwaarde ?? 0), 0);
      const beleggingenWaarde = posities.posities.length > 0
        ? posities.posities.reduce((som, p) => som + (p.huidige_waarde ?? 0), 0)
        : null;

      // Som van de laatste waarde PER locatie (meerdere panden mogen niet
      // bij elkaar opgeteld lijken in de grafiek, maar horen wel samen op
      // te tellen in het totale vermogen op deze kaart).
      const vastgoedPerLocatie = await Promise.all(vastgoedLocaties.locaties.map((l) => getWaardes(l.id)));
      const heeftVastgoedData = vastgoedPerLocatie.some((res) => res.waardes.length > 0);
      const totaalVastgoedWaarde = vastgoedPerLocatie.reduce((som, res) => {
        const laatste = [...res.waardes].sort((a, b) => a.datum.localeCompare(b.datum)).at(-1);
        return som + (laatste?.waarde ?? 0);
      }, 0);

      const uitgavenDezeMaand = totalen.reeks.reduce((som, r) => som + r.uitgaven, 0);
      // Netto overwaarde (woningwaarde - hypotheekschuld) i.p.v. twee losse
      // kaarten — Woning is nu ook echt één pagina, dus hoort hier ook als
      // één cijfer te tonen.
      const woningOverwaarde = heeftVastgoedData ? totaalVastgoedWaarde - hypotheek.actuele_schuld_totaal : null;

      setModules([
        { titel: "Uitgaven deze maand", pad: "/uitgaven", waarde: uitgavenDezeMaand },
        { titel: "Vaste lasten / mnd", pad: "/vaste-lasten", waarde: abonnementen.totaal_per_maand },
        { titel: "Spullen (dagwaarde)", pad: "/spullen", waarde: inboedelWaarde },
        { titel: "Beleggingen", pad: "/beleggingen", waarde: beleggingenWaarde },
        { titel: "Woning (overwaarde)", pad: "/woning", waarde: woningOverwaarde },
      ]);
    });
  }

  function laadWidgets() {
    return getWidgets().then((res) => setWidgets(res.widgets));
  }

  useEffect(() => {
    Promise.all([laadModuleKaarten(), laadWidgets()])
      .catch((err) => setFoutmelding(err instanceof ApiError ? err.message : "Kon overzicht niet laden."))
      .finally(() => setLaden(false));
  }, []);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Overzicht</h1>
      </div>

      {foutmelding && (
        <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {foutmelding}
        </p>
      )}

      <div className={laden ? "flex flex-col gap-6 opacity-50 transition-opacity" : "flex flex-col gap-6 transition-opacity"}>
        <div>
          <h2 className="mb-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Modules</h2>
          <ModuleKaarten modules={modules} />
        </div>

        <WidgetenSectie widgets={widgets} onWidgetsGewijzigd={() => laadWidgets()} />
      </div>
    </main>
  );
}
